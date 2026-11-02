import "server-only";

import { getGift as findGift, searchGifts } from "@/lib/data/gifts.server";
import { getStudentSkills as getSkills } from "@/lib/data/student-skills.server";
import {
  getStudentDetails,
  searchStudents,
  studentMediaUrls,
} from "@/lib/data/students.server";
import { getCachedGameBanners } from "@/lib/game-banners.server";
import { notFound } from "@/lib/public-api/route";
import { getCachedRoadmapItems } from "@/lib/roadmap/roadmap.server";
import { resolveStudentIdentifier } from "@/lib/student-resolve.server";
import { buildItemIconUrl } from "@/lib/url";
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

export const studentSearchSchema = z.object({
  q: z.string().optional().describe("Fuzzy name or search-tag query."),
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

export async function listStudents({
  q,
  ...filters
}: z.infer<typeof studentSearchSchema>) {
  const students = await searchStudents({ query: q, ...filters });

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

  return { ...student, ...studentMediaUrls(student.id) };
}

export const studentSkillsSchema = z.object({
  locale: z.enum(["en", "ja"]).default("en"),
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
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export async function listGifts({
  q,
  limit,
}: z.infer<typeof giftSearchSchema>) {
  const gifts = await searchGifts({ query: q, limit });

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

  return { ...gift, iconUrl: buildItemIconUrl(gift.iconName) };
}

export async function listBanners() {
  return await getCachedGameBanners();
}

export async function getRoadmap() {
  return await getCachedRoadmapItems();
}
