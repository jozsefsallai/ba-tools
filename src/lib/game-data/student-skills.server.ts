import { db } from "../db";
import type { SkillLocale as DbSkillLocale } from "../db/client";
import type {
  ExtractStudentSkillsResult,
  SkillLocale,
  SkillStudent,
} from "./contract";
import {
  resolveAllImageStudents,
  resolveImageStudents,
} from "./existing-students.server";

export async function resolveSkillStudents(
  devNames?: string[],
): Promise<SkillStudent[]> {
  return devNames && devNames.length > 0
    ? resolveImageStudents(devNames)
    : resolveAllImageStudents();
}

const entries = <T>(record: Partial<Record<SkillLocale, T>>) =>
  Object.entries(record) as [
    DbSkillLocale,
    T,
  ][];

export interface SaveStudentSkillsResult {
  effects: number;
  students: number;
  skills: number;
}

export async function saveStudentSkills(
  result: ExtractStudentSkillsResult,
): Promise<SaveStudentSkillsResult> {
  for (const effect of result.effects) {
    const fields = {
      hash: String(effect.hash),
      category: effect.category,
      iconName: effect.iconName,
      filterable: effect.filterable,
    };

    await db.skillEffect.upsert({
      where: {
        id: effect.id,
      },
      create: {
        id: effect.id,
        ...fields,
      },
      update: fields,
    });
  }

  const effectIds = result.effects.map((e) => e.id);

  await db.$transaction([
    db.skillEffectText.deleteMany({
      where: {
        effectId: {
          in: effectIds,
        },
      },
    }),
    db.skillEffectText.createMany({
      data: result.effects.flatMap((effect) =>
        entries(effect.texts).map(([locale, text]) => ({
          effectId: effect.id,
          locale,
          ...text,
        })),
      ),
    }),
  ]);

  const studentIds = [
    ...new Set(result.skills.map((s) => s.studentId)),
  ];

  await db.$transaction([
    db.studentSkill.deleteMany({
      where: {
        studentId: {
          in: studentIds,
        },
      },
    }),

    db.studentSkill.createMany({
      data: result.skills.map((skill) => ({
        id: skill.id,
        studentId: skill.studentId,
        groupId: skill.groupId,
        type: skill.type,
        source: skill.source,
        sortOrder: skill.sortOrder,
        formIndices: skill.formIndices,
        requiredWeaponGrade: skill.requiredWeaponGrade,
        requiredGearTier: skill.requiredGearTier,
        upgradeOfId: skill.upgradeOfId,
        parentId: skill.parentId,
        iconName: skill.iconName,
        maxLevel: skill.maxLevel,
        levelCount: skill.levelCount,
        costs: skill.costs,
        stats: skill.stats,
      })),
    }),

    db.studentSkillText.createMany({
      data: result.skills.flatMap((skill) =>
        entries(skill.texts).map(([locale, text]) => ({
          skillId: skill.id,
          locale,
          ...text,
        })),
      ),
    }),

    db.studentSkillEffect.createMany({
      data: result.skills.flatMap((skill) =>
        skill.effectIds.map((effectId) => ({
          skillId: skill.id,
          effectId,
        })),
      ),
    }),
  ]);

  return {
    effects: result.effects.length,
    students: studentIds.length,
    skills: result.skills.length,
  };
}
