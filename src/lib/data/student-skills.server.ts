import "server-only";

import { cache } from "react";
import { db } from "@/lib/db";
import type {
  SkillEffectCategory,
  SkillLocale,
  SkillType,
  StudentSkillSource,
} from "@/lib/db/client";
import { buildEffectIconUrl, buildSkillIconUrl } from "@/lib/url";

const TEXT_LOCALES: Record<string, SkillLocale[]> = {
  en: [
    "en",
    "jp",
  ],
  ja: [
    "jp",
    "en",
  ],
};

export type StudentSkillView = {
  id: string;
  type: SkillType;
  source: StudentSkillSource;
  sortOrder: number;
  formIndices: number[];
  requiredWeaponGrade: number;
  requiredGearTier: number;
  upgradeOfId: string | null;
  parentId: string | null;
  iconUrl: string | null;
  maxLevel: number;
  costs: number[];
  name: string;
  templates: string[];
  levelTemplates: number[];
  params: string[][];
  useCondition: string | null;
  isFallback: boolean;
  effectIds: string[];
};

export type SkillEffectText = {
  name: string;
  description: string | null;
  suffix: string | null;
};

export type SkillEffectView = {
  id: string;
  category: SkillEffectCategory;
  iconUrl: string | null;
  text: SkillEffectText | null;
  fallbackText: SkillEffectText | null;
};

export type StudentSkillsView = {
  skills: StudentSkillView[];
  effects: Record<string, SkillEffectView>;
};

function pick<
  T extends {
    locale: SkillLocale;
  },
>(texts: T[], locales: SkillLocale[]): T | null {
  for (const locale of locales) {
    const text = texts.find((t) => t.locale === locale);
    if (text) {
      return text;
    }
  }

  return null;
}

export const getStudentSkills = cache(
  async (studentId: string, locale: string): Promise<StudentSkillsView> => {
    const locales = TEXT_LOCALES[locale] ?? TEXT_LOCALES.en;

    const rows = await db.studentSkill.findMany({
      where: {
        studentId,
      },
      orderBy: {
        sortOrder: "asc",
      },
      include: {
        texts: {
          where: {
            locale: {
              in: locales,
            },
          },
        },
        effects: {
          select: {
            effect: {
              include: {
                texts: {
                  where: {
                    locale: {
                      in: locales,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const effects: Record<string, SkillEffectView> = {};
    const skills: StudentSkillView[] = [];

    for (const row of rows) {
      const text = pick(row.texts, locales);
      if (!text) {
        continue;
      }

      for (const { effect } of row.effects) {
        const textIn = (locale: SkillLocale): SkillEffectText | null => {
          const text = effect.texts.find((t) => t.locale === locale);
          return text
            ? {
                name: text.name,
                description: text.description,
                suffix: text.suffix,
              }
            : null;
        };

        effects[effect.id] ??= {
          id: effect.id,
          category: effect.category,
          iconUrl: effect.iconName ? buildEffectIconUrl(effect.iconName) : null,
          text: textIn(locales[0]),
          fallbackText: textIn(locales[1]),
        };
      }

      skills.push({
        id: row.id,
        type: row.type,
        source: row.source,
        sortOrder: row.sortOrder,
        formIndices: row.formIndices,
        requiredWeaponGrade: row.requiredWeaponGrade,
        requiredGearTier: row.requiredGearTier,
        upgradeOfId: row.upgradeOfId,
        parentId: row.parentId,
        iconUrl: row.iconName ? buildSkillIconUrl(row.iconName) : null,
        maxLevel: row.maxLevel,
        costs: row.costs,
        name: text.name,
        templates: text.templates,
        levelTemplates: text.levelTemplates,
        params: text.params as string[][],
        useCondition: text.useCondition,
        isFallback: text.locale !== locales[0],
        effectIds: row.effects.map(({ effect }) => effect.id),
      });
    }

    return {
      skills,
      effects,
    };
  },
);
