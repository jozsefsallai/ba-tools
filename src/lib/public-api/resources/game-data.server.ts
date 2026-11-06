import "server-only";

import { z } from "zod";
import {
  colorEnum,
  resolveAttackType,
  resolveDefenseType,
} from "@/lib/combat-colors";
import { getGift as findGift, searchGifts } from "@/lib/data/gifts.server";
import { getStudentSkills as getSkills } from "@/lib/data/student-skills.server";
import {
  getStudentDetails,
  searchStudents,
  studentMediaUrls,
} from "@/lib/data/students.server";
import { getCachedGameBanners } from "@/lib/game-banners.server";
import { notFound } from "@/lib/public-api/route";
import { ROADMAP_ITEM_KINDS } from "@/lib/roadmap/constants";
import { getCachedRoadmapItems } from "@/lib/roadmap/roadmap.server";
import { resolveStudentIdentifier } from "@/lib/student-resolve.server";
import { buildItemIconUrl } from "@/lib/url";
import {
  AttackType,
  Club,
  CombatClass,
  CombatRole,
  DefenseType,
  School,
  WeaponType,
} from "~prisma";

export const studentSearchSchema = z.object({
  q: z.string().optional().describe("Fuzzy name or search-tag query."),
  school: z.enum(School).optional(),
  club: z.enum(Club).optional(),
  attackType: colorEnum(Object.values(AttackType)).optional(),
  defenseType: colorEnum(Object.values(DefenseType)).optional(),
  combatClass: z.enum(CombatClass).optional(),
  combatRole: z.enum(CombatRole).optional(),
  weaponType: z.enum(WeaponType).optional(),
  rarity: z.coerce
    .number()
    .int()
    .min(1)
    .max(3)
    .optional()
    .describe("Base star rarity, 1-3."),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(500)
    .default(500)
    .describe("Maximum number of students to return."),
});

export async function listStudents({
  q,
  attackType,
  defenseType,
  ...filters
}: z.infer<typeof studentSearchSchema>) {
  const students = await searchStudents({
    query: q,
    ...filters,
    attackType: attackType && resolveAttackType(attackType),
    defenseType: defenseType && resolveDefenseType(defenseType),
  });

  return students.map((student) => ({
    ...student,
    ...studentMediaUrls(student.id),
  }));
}

export async function getStudent(identifier: string) {
  const student = await getStudentDetails(identifier);
  if (!student) {
    throw notFound("Student not found.");
  }

  return {
    ...student,
    ...studentMediaUrls(student.id),
  };
}

export const studentSkillsSchema = z.object({
  locale: z
    .enum([
      "en",
      "ja",
    ])
    .default("en")
    .describe("Language of the skill text."),
});

export async function getStudentSkills(
  identifier: string,
  { locale }: z.infer<typeof studentSkillsSchema>,
) {
  const resolved = await resolveStudentIdentifier(identifier);
  if (!resolved) {
    throw notFound("Student not found.");
  }

  return await getSkills(resolved.id, locale);
}

export const giftSearchSchema = z.object({
  q: z.string().optional().describe("Matches the English or Japanese name."),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe("Maximum number of gifts to return."),
});

export async function listGifts({
  q,
  limit,
}: z.infer<typeof giftSearchSchema>) {
  const gifts = await searchGifts({
    query: q,
    limit,
  });

  return gifts.map((gift) => ({
    ...gift,
    iconUrl: buildItemIconUrl(gift.iconName),
  }));
}

export async function getGift(id: string | number) {
  const giftId = Number(id);
  const gift = Number.isSafeInteger(giftId) ? await findGift(giftId) : null;
  if (!gift) {
    throw notFound("Gift not found.");
  }

  return {
    ...gift,
    iconUrl: buildItemIconUrl(gift.iconName),
  };
}

export async function listBanners() {
  return await getCachedGameBanners();
}

const roadmapDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Must be an ISO date.");

export const roadmapSchema = z.object({
  categories: z
    .array(z.enum(ROADMAP_ITEM_KINDS))
    .optional()
    .describe(
      "Only these kinds of items: `banner` (recruitment), `raid` (Total Assault, Grand Assault, Joint Firing Drill, Allied Operation), `frr` (Final Restriction Release), `event`, `story`, `bonus` (bonus reward campaigns), `workLog`, `battlePass` or `etc`. All of them when left out.",
    ),
  from: roadmapDate
    .optional()
    .describe(
      "ISO date or date-time; only items still running at or after it. Use the current time for current and upcoming content.",
    ),
  to: roadmapDate
    .optional()
    .describe("ISO date or date-time; only items starting at or before it."),
});

export async function getRoadmap({
  categories,
  from,
  to,
}: z.infer<typeof roadmapSchema> = {}) {
  const items = await getCachedRoadmapItems();
  const fromTime = from ? new Date(from).getTime() : undefined;
  const toTime = to ? new Date(to).getTime() : undefined;

  return items.filter(
    (item) =>
      (!categories || (categories as string[]).includes(item.kind)) &&
      (fromTime === undefined ||
        new Date(item.endDate).getTime() >= fromTime) &&
      (toTime === undefined || new Date(item.startDate).getTime() <= toTime),
  );
}
