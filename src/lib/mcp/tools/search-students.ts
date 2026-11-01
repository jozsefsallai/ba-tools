import { searchStudents } from "@/lib/data/students.server";
import { jsonText } from "@/lib/mcp/json-text";
import { mapStudentScalarEnumsToEn } from "@/lib/mcp/student-enum-labels-en";
import { addStudentMediaUrlFieldsForMcp } from "@/lib/mcp/student-media-urls";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  AttackType,
  Club,
  CombatClass,
  CombatRole,
  DefenseType,
  School,
  WeaponType,
} from "~prisma";

export function registerSearchStudentsTool(server: McpServer) {
  server.registerTool(
    "search_students",
    {
      title: "Search students",
      description:
        "Search Blue Archive students with optional combat filters. When `query` is set: all students matching the non-text filters are loaded, then ranked with a fuzzy scoring algorithm. Results are best match first and include `matchScore`. Each student includes `iconUrl` and `portraitUrl` (CDN paths). When `query` is omitted, returns up to `limit` rows in default roster order.",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("Fuzzy search against display name and searchTags"),
        school: z.enum(School).optional(),
        club: z.enum(Club).optional(),
        attackType: z.enum(AttackType).optional(),
        defenseType: z.enum(DefenseType).optional(),
        combatClass: z.enum(CombatClass).optional(),
        combatRole: z.enum(CombatRole).optional(),
        weaponType: z.enum(WeaponType).optional(),
        rarity: z
          .number()
          .int()
          .min(1)
          .max(3)
          .optional()
          .describe("In-game star rarity (1-3)"),
        limit: z.number().int().min(1).max(100).optional().default(50),
      },
    },
    async (args) => {
      const students = await searchStudents(args);

      if (students.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: args.query?.trim()
                ? "No students matched the query and filters (fuzzy score threshold 0.15)."
                : "No students matched the filters.",
            },
          ],
        };
      }

      const forMcp = students.map(({ matchScore, ...s }) =>
        addStudentMediaUrlFieldsForMcp(
          mapStudentScalarEnumsToEn({
            ...s,
            ...(matchScore !== undefined ? { matchScore } : {}),
          } as Record<string, unknown>),
        ),
      );

      return {
        content: [{ type: "text", text: jsonText(forMcp) }],
      };
    },
  );
}
