import { db } from "@/lib/db";
import { jsonText } from "@/lib/mcp/json-text";
import { mapStudentScalarEnumsToEn } from "@/lib/mcp/student-enum-labels-en";
import { orderStudentsByFuzzyNameQuery } from "@/lib/student-search-query";
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
        "Search Blue Archive students with optional combat filters. When `query` is set: all students matching the non-text filters are loaded, then ranked with a fuzzy scoring algorithm. Results are best match first and include `matchScore`. When `query` is omitted, returns up to `limit` rows in default roster order.",
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
      const {
        query,
        school,
        club,
        attackType,
        defenseType,
        combatClass,
        combatRole,
        weaponType,
        rarity,
        limit,
      } = args;

      const structuralFilters: object[] = [];
      if (school) structuralFilters.push({ school });
      if (club) structuralFilters.push({ club });
      if (attackType) structuralFilters.push({ attackType });
      if (defenseType) structuralFilters.push({ defenseType });
      if (combatClass) structuralFilters.push({ combatClass });
      if (combatRole) structuralFilters.push({ combatRole });
      if (weaponType) structuralFilters.push({ weaponType });
      if (rarity !== undefined) structuralFilters.push({ rarity });

      const select = {
        id: true,
        name: true,
        devName: true,
        school: true,
        club: true,
        combatClass: true,
        combatRole: true,
        combatPosition: true,
        attackType: true,
        defenseType: true,
        weaponType: true,
        rarity: true,
        searchTags: true,
      } as const;

      const where =
        structuralFilters.length > 0 ? { AND: structuralFilters } : undefined;

      if (query?.trim()) {
        const searchInput = query.trim();
        const candidates = await db.student.findMany({
          where,
          orderBy: { defaultOrder: "asc" },
          select,
        });

        const { ordered, primaryScores, secondaryScores } =
          orderStudentsByFuzzyNameQuery(candidates, searchInput);

        const students = ordered.slice(0, limit);

        const forMcp = students.map((s) =>
          mapStudentScalarEnumsToEn({
            ...s,
            matchScore:
              primaryScores.get(s.id) ?? secondaryScores.get(s.id) ?? 0,
          } as Record<string, unknown>),
        );

        return {
          content: [
            {
              type: "text",
              text:
                students.length === 0
                  ? "No students matched the query and filters (fuzzy score threshold 0.15)."
                  : jsonText(forMcp),
            },
          ],
        };
      }

      const students = await db.student.findMany({
        where,
        orderBy: { defaultOrder: "asc" },
        take: limit,
        select,
      });

      const forMcp = students.map((s) =>
        mapStudentScalarEnumsToEn({ ...s } as Record<string, unknown>),
      );

      return {
        content: [
          {
            type: "text",
            text:
              students.length === 0
                ? "No students matched the filters."
                : jsonText(forMcp),
          },
        ],
      };
    },
  );
}
