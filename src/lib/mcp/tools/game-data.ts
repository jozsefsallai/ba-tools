import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineTool, idInput } from "@/lib/mcp/define-tool";
import { describeEnumLabels, type EnumSection } from "@/lib/mcp/enrich.server";
import {
  getGift,
  getRoadmap,
  getStudent,
  getStudentSkills,
  giftSearchSchema,
  listBanners,
  listGifts,
  listStudents,
  studentSearchSchema,
  studentSkillsSchema,
} from "@/lib/public-api/resources/game-data.server";

const studentIdentifier = idInput(
  "Student id, or a name to resolve (e.g. `Hoshino`, `Shiroko (Swimsuit)`).",
);

const enumFilters = [
  "school",
  "club",
  "attackType",
  "defenseType",
  "combatClass",
  "combatRole",
  "weaponType",
] as const satisfies (keyof typeof studentSearchSchema.shape & EnumSection)[];

const studentSearchInput = {
  ...studentSearchSchema.shape,
  ...Object.fromEntries(
    enumFilters.map((key) => [
      key,
      studentSearchSchema.shape[key].describe(
        `Internal value = in-game name: ${describeEnumLabels(key)}.`,
      ),
    ]),
  ),
} as typeof studentSearchSchema.shape;

export function registerGameDataTools(server: McpServer) {
  defineTool(
    server,
    "search_students",
    {
      title: "Search students",
      description:
        "Search Blue Archive students by fuzzy name (`q`) and combat filters. With `q`, results are best match first and include `matchScore`. Each student has `iconUrl` and `portraitUrl`. Enum fields are internal names; use the `…Label` field beside each (e.g. `defenseType: Unarmed`, `defenseTypeLabel: Special`) when talking to the user.",
      kind: "read",
      input: studentSearchInput,
    },
    (input) => listStudents(input),
  );

  defineTool(
    server,
    "get_student",
    {
      title: "Get student",
      description:
        "One student's full profile: stats, terrain adaptation (`…Grade`: D to SS; street = Urban, outdoor = Field, indoor = Indoor), gift preferences (adored/loved/liked gifts), and variants. Use the `…Label` fields, not the internal enum names, when talking to the user.",
      kind: "read",
      input: {
        student: studentIdentifier,
      },
    },
    ({ student }) => getStudent(student),
  );

  defineTool(
    server,
    "get_student_skills",
    {
      title: "Get student skills",
      description:
        "A student's skills (EX, basic, enhanced, sub, and weapon/gear upgrades) with per-level descriptions and effects.",
      kind: "read",
      input: {
        student: studentIdentifier,
        ...studentSkillsSchema.shape,
      },
    },
    ({ student, ...options }) => getStudentSkills(student, options),
  );

  defineTool(
    server,
    "search_gifts",
    {
      title: "Search gifts",
      description:
        "Search gifts by English or Japanese name. Each gift lists the students who adore, love, or like it.",
      kind: "read",
      input: giftSearchSchema.shape,
    },
    (input) => listGifts(input),
  );

  defineTool(
    server,
    "get_gift",
    {
      title: "Get gift",
      description: "One gift, including its description.",
      kind: "read",
      input: {
        giftId: idInput("Numeric gift id from `search_gifts`."),
      },
    },
    ({ giftId }) => getGift(giftId),
  );

  defineTool(
    server,
    "list_banners",
    {
      title: "List banners",
      description:
        "The Global server's recruitment banners, past and upcoming, with their pickup students.",
      kind: "read",
    },
    () => listBanners(),
  );

  defineTool(
    server,
    "get_roadmap",
    {
      title: "Get roadmap",
      description:
        "The projected Global server roadmap: upcoming events, raids, and other content.",
      kind: "read",
    },
    () => getRoadmap(),
  );
}
