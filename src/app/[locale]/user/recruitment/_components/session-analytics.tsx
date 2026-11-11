"use client";

import { useTranslations } from "next-intl";
import { useStudents } from "@/hooks/use-students";
import {
  type PickupClassification,
  RECRUITMENT_COLORS,
  type RecruitmentStats,
} from "@/lib/recruitment";
import { buildStudentIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

const CLASSIFICATION_COLORS: Record<PickupClassification, string> = {
  beforeSoftPity: "text-emerald-600 dark:text-emerald-400",
  softWin: "text-emerald-600 dark:text-emerald-400",
  afterSoftPity: "text-amber-600 dark:text-amber-400",
  hardPity: "text-rose-600 dark:text-rose-400",
};

type StatsProps = {
  stats: RecruitmentStats;
};

export function PullComposition({ stats }: StatsProps) {
  const t = useTranslations();

  const total = stats.paidPulls + stats.rebatePulls;
  const paidPercentage = total === 0 ? 0 : (stats.paidPulls / total) * 100;

  return (
    <div className="grid gap-1.5">
      <div className="flex h-2.5 overflow-hidden bg-muted">
        <div
          style={{
            width: `${paidPercentage}%`,
            backgroundColor: RECRUITMENT_COLORS.base.accent,
          }}
        />

        {stats.rebatePulls > 0 && (
          <div
            className="flex-1"
            style={{
              backgroundColor: RECRUITMENT_COLORS.limited.accent,
            }}
          />
        )}
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {t("tools.recruitment.paidPulls")}: {stats.paidPulls}
        </span>

        <span>
          {t("tools.recruitment.rebatePulls")}: {stats.rebatePulls}
        </span>
      </div>
    </div>
  );
}

export function Acquisitions({ stats }: StatsProps) {
  const t = useTranslations();
  const { studentMap } = useStudents();

  if (stats.pickupClassifications.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("tools.recruitment.noAcquisitions")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {stats.pickupClassifications.map((pickup, index) => {
        const student = studentMap[pickup.studentId];

        return (
          <li
            className="flex items-center gap-3 border-b py-2 last:border-b-0"
            key={`${pickup.studentId}-${index}`}
          >
            {student ? (
              <img
                src={buildStudentIconUrl(student)}
                alt=""
                className="size-10 rounded-full object-cover"
              />
            ) : (
              <div className="size-10 rounded-full bg-muted" />
            )}

            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">
                {student?.name ?? pickup.studentId}
              </div>

              <div
                className={cn(
                  "text-xs",
                  CLASSIFICATION_COLORS[pickup.classification],
                )}
              >
                {t(
                  `tools.recruitment.classifications.${pickup.classification}`,
                )}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="font-nexon-football-gothic text-lg leading-none">
                {pickup.charge}
              </div>

              <div className="text-xs text-muted-foreground">
                {t("tools.recruitment.pickupCharge")}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
