"use client";

import { Slider } from "@/components/ui/slider";
import {
  type StudentGrowthStats as GrowthStats,
  STUDENT_MAX_LEVEL,
  getStudentStatsAtLevel,
} from "@/lib/student-stats";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

const STAT_KEYS = ["maxHP", "atk", "def", "heal"] as const;

type StudentGrowthStatsProps = {
  stats: GrowthStats;
  rarity: number;
};

export function StudentGrowthStats({ stats, rarity }: StudentGrowthStatsProps) {
  const t = useTranslations();
  const numberFormat = new Intl.NumberFormat(useLocale());

  const [level, setLevel] = useState(STUDENT_MAX_LEVEL);

  const values = getStudentStatsAtLevel(stats, level, rarity);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="w-14 shrink-0 text-sm font-semibold tabular-nums">
          {t("tools.students.detail.stats.level", { level })}
        </span>

        <Slider
          min={1}
          max={STUDENT_MAX_LEVEL}
          step={1}
          value={[level]}
          onValueChange={([value]) => setLevel(value)}
          aria-label={t("tools.students.detail.stats.levelLabel")}
        />
      </div>

      <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {STAT_KEYS.map((key) => (
          <div
            key={key}
            className="bg-background flex flex-col gap-1 rounded-lg border px-4 py-3"
          >
            <dt className="text-muted-foreground truncate text-sm">
              {t(`tools.students.detail.stats.${key}`)}
            </dt>

            <dd className="text-2xl font-bold tabular-nums">
              {numberFormat.format(values[key])}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
