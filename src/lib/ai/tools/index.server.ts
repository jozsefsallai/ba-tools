import "server-only";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolSet } from "ai";
import { tool } from "ai";
import { z } from "zod";
import { formatLoreSections, queryLore } from "@/lib/ai/lore.server";
import { PREPARE_CHANGES_TOOL } from "@/lib/ai/tool-parts";
import { compactForModel } from "@/lib/ai/tools/compact";
import { mergeRosterStudents } from "@/lib/ai/tools/roster-merge";
import { summarizeSkills } from "@/lib/ai/tools/skills";
import { convexToZodShape } from "@/lib/mcp/convex-to-zod";
import {
  describeEnumInput,
  withEnumLabels,
  withGiftNames,
} from "@/lib/mcp/enrich.server";
import { rosterUpdateDocs } from "@/lib/mcp/field-docs";
import { registerMcpTools } from "@/lib/mcp/register-tools";
import { toApiError } from "@/lib/public-api/convex.server";
import { rateLimit } from "@/lib/public-api/rate-limit.server";
import {
  getRoadmap,
  getStudentSkills,
  giftSearchSchema,
  listGifts,
  listStudents,
  roadmapSchema,
  studentSearchSchema,
} from "@/lib/public-api/resources/game-data.server";
import {
  listRecruitmentAccounts,
  listRecruitmentSessions,
} from "@/lib/public-api/resources/recruitment.server";
import {
  getRoster,
  listRosters,
  updateRoster,
} from "@/lib/public-api/resources/rosters.server";
import { ApiError } from "@/lib/public-api/response";
import { rosterUpdateArgs } from "~convex-lib/validators";

const MAX_ROADMAP_ITEMS = 30;
const MAX_ROSTER_CHARS = 48_000;

const CHANGE_SUMMARY_FIELD = "change_summary";

const changeSummaryInput = {
  [CHANGE_SUMMARY_FIELD]: z
    .string()
    .describe(
      "One short sentence for Sensei's approval request saying exactly what will change, naming the item rather than its id. Write it in Sensei's language.",
    ),
};

const APPROVAL_NOTE =
  "Sensei must approve this before it runs, so call it only after they've asked for it.";

const DELETE_NOTE =
  "This is permanent, so only call it when Sensei explicitly asked to delete this item.";

const enumFilters = [
  "school",
  "club",
  "attackType",
  "defenseType",
  "combatClass",
  "combatRole",
  "weaponType",
] as const;

const studentSearchInput = {
  ...studentSearchSchema.shape,
  ...Object.fromEntries(
    enumFilters.map((key) => [
      key,
      studentSearchSchema.shape[key].describe(describeEnumInput(key)),
    ]),
  ),
  limit: z.number().int().min(1).max(50).default(20),
} as typeof studentSearchSchema.shape;

const EDIT_AREAS = [
  "formations",
  "timelines",
  "rosters",
  "gifts",
  "pvp",
  "recruitment",
  "preferences",
] as const;

type EditArea = (typeof EDIT_AREAS)[number];

function getEditArea(toolName: string): EditArea | null {
  if (!/^(create|update|delete)_/.test(toolName)) {
    return null;
  }

  if (toolName.includes("pvp")) {
    return "pvp";
  }

  if (toolName.includes("preferences")) {
    return "preferences";
  }

  return (
    EDIT_AREAS.find((area) => toolName.includes(area.replace(/s$/, ""))) ?? null
  );
}

export function getActivePlanaTools(
  tools: ToolSet,
  steps: {
    toolCalls: {
      toolName: string;
      input: unknown;
    }[];
  }[],
) {
  const requested = new Set(
    steps.flatMap(({ toolCalls }) =>
      toolCalls.flatMap(({ toolName, input }) =>
        toolName === PREPARE_CHANGES_TOOL
          ? [
              (
                input as {
                  area?: EditArea;
                }
              ).area,
            ]
          : [],
      ),
    ),
  );

  return Object.keys(tools).filter((name) => {
    const area = getEditArea(name);

    return !area || requested.has(area);
  });
}

type McpToolConfig = {
  description?: string;
  inputSchema?: z.ZodRawShape;
  annotations?: {
    readOnlyHint?: boolean;
  };
};

type McpToolCallback = (
  args: unknown,
  extra: {
    authInfo: {
      extra: {
        userId: string;
      };
    };
  },
) => Promise<CallToolResult>;

type McpTool = {
  name: string;
  config: McpToolConfig;
  callback: McpToolCallback;
};

const SAVED_LINKS: Record<string, (id: string) => string> = {
  create_formation: (id) => `/formation-display?id=${id}`,
  update_formation: (id) => `/formation-display?id=${id}`,
  create_timeline: (id) => `/timeline-visualizer?id=${id}`,
  update_timeline: (id) => `/timeline-visualizer?id=${id}`,
};

let mcpTools: McpTool[] | undefined;

function getMcpTools() {
  if (!mcpTools) {
    const collected: McpTool[] = [];

    registerMcpTools({
      registerTool: (
        name: string,
        config: McpToolConfig,
        callback: McpToolCallback,
      ) => {
        collected.push({
          name,
          config,
          callback,
        });
      },
    } as unknown as McpServer);

    mcpTools = collected;
  }

  return mcpTools;
}

function parseMcpResult(result: CallToolResult) {
  const [content] = result.content;
  const text = content?.type === "text" ? content.text : "";

  if (result.isError) {
    return {
      error: text.includes("NOT_FOUND")
        ? `${text} Ids must be copied exactly, character for character, from an earlier result.`
        : text,
    };
  }

  try {
    return compactForModel(JSON.parse(text));
  } catch {
    return {
      result: text,
    };
  }
}

function withoutChangeSummary(input: unknown) {
  const { [CHANGE_SUMMARY_FIELD]: _summary, ...args } = input as Record<
    string,
    unknown
  >;

  return args;
}

function describeSaved(name: string, result: unknown) {
  const record = (
    typeof result === "object" && result !== null ? result : {}
  ) as Record<string, unknown>;

  if (record.error) {
    return record;
  }

  const id = record.id;
  const link =
    typeof id === "string" && SAVED_LINKS[name]?.(id)
      ? {
          id,
          link: SAVED_LINKS[name](id),
        }
      : {};

  return {
    saved: true,
    note: "Sensei approved this and it's done. No further confirmation is needed.",
    ...link,
    // Other tools may need the new item's details, such as its id.
    ...(link.link ? {} : record),
  };
}

async function resolveRecruitmentAccountId(userId: string, account: string) {
  const accounts = (await listRecruitmentAccounts(userId)) as {
    id: string;
    name?: string;
    gameServer?: string;
  }[];
  const wanted = account.trim().toLowerCase();
  const match =
    accounts.find(({ id }) => id === account.trim()) ??
    accounts.find(({ name }) => name?.toLowerCase() === wanted) ??
    accounts.find(({ gameServer }) => gameServer?.toLowerCase() === wanted);

  if (!match) {
    throw new ApiError(
      "NOT_FOUND",
      `No recruitment account matches that. Sensei's accounts: ${
        accounts
          .map(({ name, gameServer }) => `${name ?? "Unnamed"} (${gameServer})`)
          .join(", ") || "none"
      }.`,
    );
  }

  return match.id;
}

export function createPlanaTools({
  userId,
  locale,
}: {
  userId: string;
  locale: "en" | "ja";
}) {
  async function run(
    tier: "userRead" | "userWrite",
    action: () => Promise<unknown>,
    maxChars?: number,
  ) {
    try {
      const state = await rateLimit(tier, `user:${userId}`);

      if (state && !state.success) {
        return {
          error: "Too many requests right now. Try again in a minute.",
        };
      }

      return compactForModel(
        withEnumLabels(await withGiftNames(await action())),
        maxChars,
      );
    } catch (error) {
      const apiError = toApiError(error);

      return {
        error: apiError.fromArgumentValidation
          ? "Not found. Ids must be copied exactly, character for character, from an earlier result."
          : apiError.message,
      };
    }
  }

  function read<S extends z.ZodRawShape>(
    description: string,
    input: S,
    action: (args: z.output<z.ZodObject<S>>) => Promise<unknown>,
    maxChars?: number,
  ) {
    return tool({
      description,
      inputSchema: z.object(input),
      execute: (args) =>
        run(
          "userRead",
          () => action(args as z.output<z.ZodObject<S>>),
          maxChars,
        ),
    });
  }

  const mcp = Object.fromEntries(
    getMcpTools().map(({ name, config, callback }) => {
      const extra = {
        authInfo: {
          extra: {
            userId,
          },
        },
      };

      if (config.annotations?.readOnlyHint) {
        return [
          name,
          tool({
            description: config.description,
            inputSchema: z.object(config.inputSchema ?? {}),
            execute: async (args) =>
              parseMcpResult(await callback(args, extra)),
          }),
        ];
      }

      return [
        name,
        tool({
          description: `${config.description} ${APPROVAL_NOTE}${
            name.startsWith("delete_") ? ` ${DELETE_NOTE}` : ""
          }`,
          inputSchema: z.object({
            ...config.inputSchema,
            ...changeSummaryInput,
          }),
          needsApproval: true,
          execute: async (args) =>
            describeSaved(
              name,
              parseMcpResult(await callback(withoutChangeSummary(args), extra)),
            ),
        }),
      ];
    }),
  ) as ToolSet;

  // Where Plana's version differs from the MCP tool: outputs sized for a chat,
  // friendlier lookups, and a roster update that can't drop students.
  const rosterFields = convexToZodShape(rosterUpdateArgs, rosterUpdateDocs);

  return {
    ...mcp,

    [PREPARE_CHANGES_TOOL]: tool({
      description:
        "Call this before creating, changing or deleting any of Sensei's saved data. It makes the tools for that area available on your next step.",
      inputSchema: z.object({
        area: z.enum(EDIT_AREAS),
      }),
      execute: async ({ area }) => ({
        ready: area,
      }),
    }),

    search_story: read(
      "Search your memories of what happened in Kivotos. Use it when the memories you were given don't cover the question. The result's labels are only for your reference.",
      {
        query: z
          .string()
          .describe("A short English search using character and place names."),
      },
      async ({ query }) => {
        const context = await queryLore([
          query,
        ]);

        return context ? formatLoreSections(context) : "Nothing found.";
      },
    ),

    search_students: read(
      "Search students by fuzzy name (`q`) and combat filters. Use the `…Label` fields when talking to Sensei.",
      studentSearchInput,
      (input) => listStudents(input),
    ),

    get_student_skills: read(
      "A student's skills at max level: EX, basic, enhanced, sub, and weapon or gear upgrades.",
      {
        student: z.string().describe("Student id or name."),
      },
      async ({ student }) =>
        summarizeSkills(
          await getStudentSkills(student, {
            locale,
          }),
        ),
    ),

    search_gifts: read(
      "Search gifts by English or Japanese name. Each gift lists the students who adore, love or like it.",
      {
        ...giftSearchSchema.shape,
        limit: z.number().int().min(1).max(30).default(10),
      },
      (input) => listGifts(input),
    ),

    get_roadmap: read(
      "The projected Global server roadmap: banners, events, raids and other content, current and upcoming unless `from` says otherwise. Only the first 30 matches are returned, so narrow it with `categories`.",
      roadmapSchema.shape,
      async ({ from, ...filters }) => {
        const items = await getRoadmap({
          ...filters,
          from: from ?? new Date().toISOString(),
        });

        return items.slice(0, MAX_ROADMAP_ITEMS);
      },
    ),

    list_rosters: read(
      "Sensei's game account rosters, without the student lists. Use `get_roster` for the students.",
      {},
      async () => {
        const rosters = (await listRosters(userId)) as {
          students?: unknown[];
        }[];

        return rosters.map(({ students, ...roster }) => ({
          ...roster,
          studentCount: students?.length ?? 0,
        }));
      },
    ),

    get_roster: read(
      "One of Sensei's rosters, with every student they own and how far each is built.",
      {
        rosterId: z.string().describe("Roster id from `list_rosters`."),
      },
      ({ rosterId }) => getRoster(userId, rosterId),
      MAX_ROSTER_CHARS,
    ),

    update_roster: tool({
      description: `Change one of Sensei's rosters. Only the fields sent change. Send just the students being added or changed in \`upsertStudents\` and the ones to remove in \`removeStudentIds\`; everyone else stays as they are. ${APPROVAL_NOTE}`,
      inputSchema: z.object({
        rosterId: z.string().describe("Roster id from `list_rosters`."),
        ...rosterFields,
        students: z.never().optional(),
        upsertStudents: rosterFields.students,
        removeStudentIds: z.array(z.string()).optional(),
        ...changeSummaryInput,
      }),
      needsApproval: true,
      execute: async (input) => {
        const {
          rosterId,
          upsertStudents,
          removeStudentIds,
          students: _students,
          ...patch
        } = withoutChangeSummary(input) as Record<string, unknown> & {
          rosterId: string;
          upsertStudents?: {
            studentId: string;
          }[];
          removeStudentIds?: string[];
        };

        return describeSaved(
          "update_roster",
          await run("userWrite", async () => {
            if (!upsertStudents && !removeStudentIds) {
              return await updateRoster(userId, rosterId, patch);
            }

            const current = (await getRoster(userId, rosterId)) as {
              students: {
                studentId: string;
              }[];
            };
            return await updateRoster(userId, rosterId, {
              ...patch,
              students: mergeRosterStudents(
                current.students,
                upsertStudents,
                removeStudentIds,
              ),
            });
          }),
        );
      },
    }),

    list_recruitment_sessions: read(
      "The pull sessions of one of Sensei's recruitment accounts, with statistics.",
      {
        account: z
          .string()
          .describe(
            "The account's name or game server (e.g. `JP`), or its id. Prefer the name or server, since ids are easy to mistype.",
          ),
      },
      async ({ account }) =>
        listRecruitmentSessions(
          userId,
          await resolveRecruitmentAccountId(userId, account),
        ),
    ),
  } satisfies ToolSet;
}
