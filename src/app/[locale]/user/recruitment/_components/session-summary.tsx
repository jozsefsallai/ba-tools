"use client";

import { useTranslations } from "next-intl";
import {
  Acquisitions,
  PullComposition,
} from "@/app/[locale]/user/recruitment/_components/session-analytics";
import {
  ChargeGauge,
  Readout,
} from "@/app/[locale]/user/recruitment/_components/shared";
import type { RecruitmentStats } from "@/lib/recruitment";

type SessionSummaryProps = {
  stats: RecruitmentStats | null;
  /** Why the stats could not be worked out, already translated. */
  error?: string;
};

/** The live results of the session being edited. */
export function SessionSummary({ stats, error }: SessionSummaryProps) {
  const t = useTranslations();

  return (
    <aside className="flex flex-col gap-5 rounded-md border p-4 xl:sticky xl:top-16">
      <h2 className="font-semibold">{t("tools.recruitment.summary")}</h2>

      {stats ? (
        <>
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <ChargeGauge
              kind="permanent"
              label={t("tools.recruitment.permanentEndCharge")}
              value={stats.permanentEndCharge}
            />

            <ChargeGauge
              kind="limited"
              label={t("tools.recruitment.limitedEndCharge")}
              value={stats.limitedEndCharge}
            />
          </div>

          <PullComposition stats={stats} />

          <Readout
            className="border-t"
            items={[
              {
                label: t("tools.recruitment.pyroxenesSpent"),
                value: stats.pyroxenesSpent.toLocaleString(),
              },
              {
                label: t("tools.recruitment.pyroxenesSaved"),
                value: stats.pyroxenesSaved.toLocaleString(),
              },
              {
                label: t("tools.recruitment.ticketsUsed"),
                value: stats.rebateTicketsUsed,
              },
              {
                label: t("tools.recruitment.ticketsRemaining"),
                value: stats.remainingRebateTickets,
              },
              {
                label: t("tools.recruitment.experiencedThreeStarRate"),
                value: `${stats.experiencedThreeStarRate.toFixed(2)}%`,
              },
              {
                label: t("tools.recruitment.pullsPerThreeStar"),
                value: stats.pullsPerThreeStar?.toFixed(2) ?? "—",
              },
              {
                label: t("tools.recruitment.experiencedPURate"),
                value: `${stats.experiencedPURate.toFixed(2)}%`,
              },
              {
                label: t("tools.recruitment.pullsPerPU"),
                value: stats.pullsPerPU?.toFixed(2) ?? "—",
              },
              {
                label: t("tools.recruitment.softPity"),
                value: `${stats.softPityWins}/${stats.softPityLosses}`,
              },
              {
                label: t("tools.recruitment.hardPity"),
                value: stats.hardPities,
              },
            ]}
          />

          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold">
              {t("tools.recruitment.acquisitions")}
            </h3>

            <Acquisitions stats={stats} />
          </div>
        </>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("tools.recruitment.summaryPending")}
        </p>
      )}
    </aside>
  );
}
