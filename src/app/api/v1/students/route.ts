import { searchStudents, studentMediaUrls } from "@/lib/data/students.server";
import { ok } from "@/lib/public-api/response";
import { parseQuery, publicRoute } from "@/lib/public-api/route";
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

const querySchema = z.object({
  q: z.string().optional(),
  school: z.enum(School).optional(),
  club: z.enum(Club).optional(),
  attackType: z.enum(AttackType).optional(),
  defenseType: z.enum(DefenseType).optional(),
  combatClass: z.enum(CombatClass).optional(),
  combatRole: z.enum(CombatRole).optional(),
  weaponType: z.enum(WeaponType).optional(),
  rarity: z.coerce.number().int().min(1).max(3).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(500),
});

export const GET = publicRoute(async (req) => {
  const { q, ...filters } = parseQuery(req, querySchema);
  const students = await searchStudents({ query: q, ...filters });

  return ok(
    students.map((student) => ({
      ...student,
      ...studentMediaUrls(student.id),
    })),
    { cache: "public" },
  );
});
