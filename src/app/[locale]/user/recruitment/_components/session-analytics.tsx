"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStudents } from "@/hooks/use-students";
import {
  RECRUITMENT_COLORS,
  type RecruitmentPickup,
  type RecruitmentStats,
} from "@/lib/recruitment";
import { buildStudentIconUrl } from "@/lib/url";
import { useTranslations } from "next-intl";

export function SessionAnalytics({
  stats,
  pickups,
}: {
  stats: RecruitmentStats;
  pickups: RecruitmentPickup[];
}) {
  const t = useTranslations();

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("tools.recruitment.pullComposition")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CompositionBar stats={stats} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("tools.recruitment.costSummary")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <Metric
              label={t("tools.recruitment.paidPulls")}
              value={stats.paidPulls}
            />
            <Metric
              label={t("tools.recruitment.rebatePulls")}
              value={stats.rebatePulls}
            />
            <Metric
              label={t("tools.recruitment.pyroxenesSpent")}
              value={stats.pyroxenesSpent.toLocaleString()}
            />
            <Metric
              label={t("tools.recruitment.pyroxenesSaved")}
              value={stats.pyroxenesSaved.toLocaleString()}
            />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("tools.recruitment.acquisitions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pickups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("tools.recruitment.noAcquisitions")}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.pickupClassifications.map((pickup, index) => (
                <AcquisitionCard
                  key={`${pickup.studentId}-${index}`}
                  pickup={pickup}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CompositionBar({ stats }: { stats: RecruitmentStats }) {
  const t = useTranslations();
  const paidPercentage =
    stats.paidPulls + stats.rebatePulls === 0
      ? 0
      : (stats.paidPulls / (stats.paidPulls + stats.rebatePulls)) * 100;
  const rebatePercentage = 100 - paidPercentage;

  return (
    <div className="grid gap-2">
      <div className="flex h-5 overflow-hidden rounded-full bg-muted">
        {paidPercentage > 0 && (
          <div
            className="flex items-center justify-center text-[10px] font-medium text-white"
            style={{
              width: `${paidPercentage}%`,
              backgroundColor: RECRUITMENT_COLORS.base.accent,
            }}
          />
        )}
        {rebatePercentage > 0 && (
          <div
            className="flex items-center justify-center text-[10px] font-medium text-white"
            style={{
              width: `${rebatePercentage}%`,
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

function AcquisitionCard({
  pickup,
}: {
  pickup: RecruitmentStats["pickupClassifications"][number];
}) {
  const t = useTranslations();
  const { studentMap } = useStudents();
  const student = studentMap[pickup.studentId];
  const classification = t(
    `tools.recruitment.classifications.${pickup.classification}`,
  );

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-l-4 p-3 ${acquisitionColorClass(
        pickup.classification,
      )}`}
    >
      {student ? (
        <img
          src={buildStudentIconUrl(student)}
          alt=""
          className="size-12 rounded-full object-cover"
        />
      ) : (
        <div className="size-12 rounded-full bg-muted" />
      )}
      <div className="min-w-0">
        <div className="truncate font-medium">
          {student?.name ?? pickup.studentId}
        </div>
        <div className="text-sm text-muted-foreground">
          {t("tools.recruitment.chargeAtAcquisition", {
            charge: pickup.charge,
          })}
        </div>
        {pickup.kind && (
          <div className="text-xs text-muted-foreground">
            {t(`tools.recruitment.${pickup.kind}`)}
          </div>
        )}
        <div className="text-xs text-muted-foreground">{classification}</div>
      </div>
    </div>
  );
}

function acquisitionColorClass(
  classification: RecruitmentStats["pickupClassifications"][number]["classification"],
) {
  switch (classification) {
    case "beforeSoftPity":
      return "border-emerald-500/60 bg-emerald-500/5";
    case "softWin":
      return "border-cyan-500/60 bg-cyan-500/5";
    case "afterSoftPity":
      return "border-amber-500/60 bg-amber-500/5";
    case "hardPity":
      return "border-rose-500/60 bg-rose-500/5";
    default:
      return "border-muted";
  }
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}
