import "server-only";

import { db } from "@/lib/db";
import { resolveStudentIdentifier } from "@/lib/student-resolve.server";
import { orderStudentsByFuzzyNameQuery } from "@/lib/student-search-query";
import {
  buildStudentIconUrlFromId,
  buildStudentPortraitUrlFromId,
} from "@/lib/url";
import type {
  AttackType,
  Club,
  CombatClass,
  CombatRole,
  DefenseType,
  School,
  WeaponType,
} from "~prisma";

export type StudentSearchFilters = {
  query?: string;
  school?: School;
  club?: Club;
  attackType?: AttackType;
  defenseType?: DefenseType;
  combatClass?: CombatClass;
  combatRole?: CombatRole;
  weaponType?: WeaponType;
  rarity?: number;
  limit: number;
};

const studentSummarySelect = {
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

export function studentMediaUrls(id: string) {
  return {
    iconUrl: buildStudentIconUrlFromId(id),
    portraitUrl: buildStudentPortraitUrlFromId(id),
  };
}

export async function searchStudents(filters: StudentSearchFilters) {
  const { query, limit, ...rest } = filters;

  const structuralFilters = Object.entries(rest)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({ [key]: value }));

  const where =
    structuralFilters.length > 0 ? { AND: structuralFilters } : undefined;

  const searchInput = query?.trim();

  if (!searchInput) {
    const students = await db.student.findMany({
      where,
      orderBy: { defaultOrder: "asc" },
      take: limit,
      select: studentSummarySelect,
    });

    return students.map((student) => ({
      ...student,
      matchScore: undefined as number | undefined,
    }));
  }

  const candidates = await db.student.findMany({
    where,
    orderBy: { defaultOrder: "asc" },
    select: studentSummarySelect,
  });

  const { ordered, primaryScores, secondaryScores } =
    orderStudentsByFuzzyNameQuery(candidates, searchInput);

  return ordered.slice(0, limit).map((student) => ({
    ...student,
    matchScore:
      primaryScores.get(student.id) ?? secondaryScores.get(student.id) ?? 0,
  }));
}

export async function getStudentDetails(identifier: string) {
  const resolved = await resolveStudentIdentifier(identifier);
  if (!resolved) {
    return null;
  }

  const giftSelect = { select: { id: true, name: true, rarity: true } };
  const variantSelect = { select: { id: true, name: true, devName: true } };

  return await db.student.findUnique({
    where: { id: resolved.id },
    include: {
      giftsAdored: giftSelect,
      giftsLoved: giftSelect,
      giftsLiked: giftSelect,
      baseVariant: variantSelect,
      variants: variantSelect,
    },
  });
}
