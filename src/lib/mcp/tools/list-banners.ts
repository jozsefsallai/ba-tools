import { db } from "@/lib/db";
import { jsonText } from "@/lib/mcp/json-text";
import { mapStudentScalarEnumsToEn } from "@/lib/mcp/student-enum-labels-en";
import { findStudentIdsMatchingSearchTags } from "@/lib/mcp/student-ids-by-search-tags";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Prisma } from "~prisma";

function tryParseIsoDate(label: string, value: string): Date | null {
  const d = new Date(value.trim());
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d;
}

export function registerListBannersTool(server: McpServer) {
  server.registerTool(
    "list_banners",
    {
      title: "List / query game banners",
      description:
        "Query scheduled gacha banners for the Global server (upcoming / roadmap data). Supports: time windows (overlap), finding reruns by pickup student name or id, and untilNextFest to list banners before the next Global fest pickup. Combine filters as needed.",
      inputSchema: {
        limit: z.number().int().min(1).max(150).optional().default(50),
        includePast: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "If false (default), exclude banners that have already ended (endDate < now).",
          ),
        pickupStudentNameQuery: z
          .string()
          .optional()
          .describe(
            "Substring match on pickup students: name, devName, firstName, lastName (case-insensitive) and searchTags (normalized lowercase alphanumerics). Use for questions like when a student reruns.",
          ),
        pickupStudentId: z
          .string()
          .optional()
          .describe(
            "Exact student id; banner must include them in the pickup pool.",
          ),
        onlyUpcomingStudentRuns: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "When using student filters, restrict to banners whose startDate is still in the future.",
          ),
        overlapsFrom: z
          .string()
          .optional()
          .describe(
            "ISO 8601 date or datetime. Keep banners that overlap this instant or later (banner.endDate >= this).",
          ),
        overlapsUntil: z
          .string()
          .optional()
          .describe(
            "ISO 8601 date or datetime. Keep banners that overlap this instant or earlier (banner.startDate <= this).",
          ),
        untilNextFest: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "If true, only banners that overlap [reference, nextFestStart): reference is max(now, overlapsFrom if set). nextFestStart is the startDate of the earliest future GameBanner with isSelectablePickup=false and a pickup student with isFestGlobal=true. If none exists, other filters still apply and a note is returned.",
          ),
      },
    },
    async (args) => {
      const {
        limit,
        includePast,
        pickupStudentNameQuery,
        pickupStudentId,
        onlyUpcomingStudentRuns,
        overlapsFrom,
        overlapsUntil,
        untilNextFest,
      } = args;

      const now = new Date();
      const queryNotes: string[] = [
        "Please note that these banners are estimates based on the JP server's banner release schedule and are subject to change on the Global server.",
      ];

      let overlapsFromDate: Date | undefined;
      let overlapsUntilDate: Date | undefined;

      if (overlapsFrom?.trim()) {
        const d = tryParseIsoDate("overlapsFrom", overlapsFrom);
        if (!d) {
          return {
            content: [
              {
                type: "text",
                text: `Invalid overlapsFrom: could not parse as ISO 8601 date/datetime: ${overlapsFrom}`,
              },
            ],
            isError: true,
          };
        }
        overlapsFromDate = d;
      }

      if (overlapsUntil?.trim()) {
        const d = tryParseIsoDate("overlapsUntil", overlapsUntil);
        if (!d) {
          return {
            content: [
              {
                type: "text",
                text: `Invalid overlapsUntil: could not parse as ISO 8601 date/datetime: ${overlapsUntil}`,
              },
            ],
            isError: true,
          };
        }
        overlapsUntilDate = d;
      }

      if (
        overlapsFromDate &&
        overlapsUntilDate &&
        overlapsFromDate.getTime() > overlapsUntilDate.getTime()
      ) {
        return {
          content: [
            {
              type: "text",
              text: "overlapsFrom must be on or before overlapsUntil.",
            },
          ],
          isError: true,
        };
      }

      const andFilters: Prisma.GameBannerWhereInput[] = [];

      if (!includePast) {
        andFilters.push({ endDate: { gte: now } });
      }

      if (overlapsFromDate && overlapsUntilDate) {
        andFilters.push({
          startDate: { lte: overlapsUntilDate },
          endDate: { gte: overlapsFromDate },
        });
      } else if (overlapsFromDate) {
        andFilters.push({ endDate: { gte: overlapsFromDate } });
      } else if (overlapsUntilDate) {
        andFilters.push({ startDate: { lte: overlapsUntilDate } });
      }

      const nameQ = pickupStudentNameQuery?.trim();
      if (nameQ) {
        const tagIds = await findStudentIdsMatchingSearchTags(nameQ);
        andFilters.push({
          pickupStudents: {
            some: {
              OR: [
                { name: { contains: nameQ, mode: "insensitive" } },
                { devName: { contains: nameQ, mode: "insensitive" } },
                { firstName: { contains: nameQ, mode: "insensitive" } },
                { lastName: { contains: nameQ, mode: "insensitive" } },
                ...(tagIds.length > 0 ? [{ id: { in: tagIds } }] : []),
              ],
            },
          },
        });
      }

      if (pickupStudentId?.trim()) {
        andFilters.push({
          pickupStudents: { some: { id: pickupStudentId.trim() } },
        });
      }

      if (onlyUpcomingStudentRuns && (nameQ || pickupStudentId?.trim())) {
        andFilters.push({ startDate: { gt: now } });
      }

      let nextFestStart: Date | null = null;
      if (untilNextFest) {
        const reference = overlapsFromDate ?? now;

        const nextFest = await db.gameBanner.findFirst({
          where: {
            endDate: { gte: reference },
            isSelectablePickup: false,
            pickupStudents: { some: { isFestGlobal: true } },
          },
          orderBy: { startDate: "asc" },
          select: { id: true, startDate: true, name: true },
        });

        if (nextFest) {
          nextFestStart = nextFest.startDate;
          andFilters.push({
            startDate: { lt: nextFest.startDate },
            endDate: { gt: reference },
          });
          queryNotes.push(
            `untilNextFest: bounded before fest-typed banner starting at ${nextFest.startDate.toISOString()} (banner id ${nextFest.id}${nextFest.name ? `, name: ${nextFest.name}` : ""}).`,
          );
        } else {
          queryNotes.push(
            "untilNextFest: no upcoming GameBanner found with isFestGlobal pickup and isSelectablePickup=false; returned results without an upper fest boundary.",
          );
        }
      }

      const where: Prisma.GameBannerWhereInput =
        andFilters.length > 0 ? { AND: andFilters } : {};

      const banners = await db.gameBanner.findMany({
        where,
        orderBy: { startDate: "asc" },
        take: limit,
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          freePulls: true,
          isSelectablePickup: true,
          pickupStudents: {
            select: {
              id: true,
              name: true,
              devName: true,
              isFestGlobal: true,
              school: true,
              club: true,
              combatClass: true,
              combatRole: true,
              combatPosition: true,
              attackType: true,
              defenseType: true,
            },
          },
        },
      });

      const bannersForMcp = banners.map((b) => ({
        ...b,
        pickupStudents: b.pickupStudents.map((s) =>
          mapStudentScalarEnumsToEn({ ...s } as Record<string, unknown>),
        ),
      }));

      const payload = {
        banners: bannersForMcp,
        meta: {
          nextFestStart: nextFestStart?.toISOString() ?? null,
          queryNotes: queryNotes.length > 0 ? queryNotes : undefined,
        },
      };

      return {
        content: [
          {
            type: "text",
            text:
              banners.length === 0
                ? jsonText({
                    ...payload,
                    meta: {
                      ...payload.meta,
                      queryNotes: [
                        ...(payload.meta.queryNotes ?? []),
                        "No banners matched the combined filters.",
                      ],
                    },
                  })
                : jsonText(payload),
          },
        ],
      };
    },
  );
}
