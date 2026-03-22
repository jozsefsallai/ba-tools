import { db } from "@/lib/db";
import { jsonText } from "@/lib/mcp/json-text";
import { mapStudentScalarEnumsToEn } from "@/lib/mcp/student-enum-labels-en";
import { findStudentIdsMatchingSearchTags } from "@/lib/mcp/student-ids-by-search-tags";
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
        "Search Blue Archive students in the ba-tools database by text and optional combat filters. Returns a compact summary per student. The text query matches display/dev/first/last name and also `searchTags` (short lowercase tags, e.g. imari for Idol Mari).",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe(
            "Substring match against display name, dev name, first/last name (case-insensitive), and searchTags (normalized: lowercase, alphanumeric only)",
          ),
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

      const filters: object[] = [];
      if (query?.trim()) {
        const q = query.trim();
        const tagIds = await findStudentIdsMatchingSearchTags(q);
        filters.push({
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { devName: { contains: q, mode: "insensitive" as const } },
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            ...(tagIds.length > 0 ? [{ id: { in: tagIds } }] : []),
          ],
        });
      }
      if (school) filters.push({ school });
      if (club) filters.push({ club });
      if (attackType) filters.push({ attackType });
      if (defenseType) filters.push({ defenseType });
      if (combatClass) filters.push({ combatClass });
      if (combatRole) filters.push({ combatRole });
      if (weaponType) filters.push({ weaponType });
      if (rarity !== undefined) filters.push({ rarity });

      const students = await db.student.findMany({
        where: filters.length ? { AND: filters } : undefined,
        orderBy: { defaultOrder: "asc" },
        take: limit,
        select: {
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
        },
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
