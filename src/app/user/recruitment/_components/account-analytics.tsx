"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  type AccountAggregates,
  type AggregateBucket,
  HARD_PITY,
  SOFT_PITY,
  type RecruitmentSessionKind,
  type RecruitmentStats,
  applySessionToAggregates,
  calculateRecruitmentStats,
  emptyAccountAggregates,
} from "@/lib/recruitment";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

const PITY_COLORS = {
  beforeSoftPity: "#22c55e",
  softWin: "#a3e635",
  afterSoftPity: "#f59e0b",
  hardPity: "#ef4444",
} as const;

type Session = {
  _id: string;
  date: number;
  kind: RecruitmentSessionKind;
  isFestBanner?: boolean;
  totalPulls: number;
  permanentPulls?: number;
  limitedPulls?: number;
  pickupsObtained: {
    charge: number;
    studentId: string;
    kind?: "permanent" | "limited";
  }[];
  threeStarCount: number;
  startCharge: number;
  permanentStartCharge?: number;
  limitedStartCharge?: number;
  rebateTicketsFromPreviousSession: number;
  rebateTicketsUsed?: number;
  stats: Omit<
    RecruitmentStats,
    | "pullsPerPU"
    | "pullsPerThreeStar"
    | "pickupClassifications"
    | "pools"
    | "permanentEndCharge"
    | "limitedEndCharge"
  > & {
    pullsPerPU?: number | null;
    pullsPerThreeStar?: number | null;
    permanentEndCharge?: number;
    limitedEndCharge?: number;
    pools?: RecruitmentStats["pools"];
    pickupClassifications: {
      charge: number;
      studentId: string;
      kind?: "permanent" | "limited";
      classification: string;
    }[];
  };
};

type Filter = "all" | "permanent" | "limited" | "fest";

export function AccountAnalytics({
  sessions,
  aggregates,
}: {
  sessions: Session[];
  aggregates?: AccountAggregates;
}) {
  const t = useTranslations();
  const [filter, setFilter] = useState<Filter>("all");
  const sourceAggregates = useMemo(
    () => aggregates ?? rebuildAggregate(sessions),
    [aggregates, sessions],
  );
  const aggregate = aggregateForFilter(sourceAggregates, filter);
  const regular =
    filter === "permanent"
      ? sourceAggregates.permanent
      : filter === "fest"
        ? emptyBucket()
        : mergeBuckets(sourceAggregates.permanent, sourceAggregates.limited);
  const fest = filter === "permanent" ? emptyBucket() : sourceAggregates.fest;

  return (
    <section className="grid w-full max-w-4xl gap-4">
      <div className="flex flex-wrap justify-end gap-1">
        {(["all", "permanent", "limited", "fest"] as const).map((value) => (
          <button
            className={`rounded-md border px-3 py-1 text-sm ${
              filter === value ? "bg-accent font-medium" : ""
            }`}
            key={value}
            onClick={() => setFilter(value)}
            type="button"
          >
            {t(`tools.recruitment.filters.${value}`)}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label={t("tools.recruitment.regularThreeStarRate")}
          value={rate(regular.totalThreeStars, regular.totalPulls)}
        />
        <Metric
          label={t("tools.recruitment.festThreeStarRate")}
          value={rate(fest?.totalThreeStars ?? 0, fest?.totalPulls ?? 0)}
        />
        <Metric
          label={t("tools.recruitment.accountPURate")}
          value={rate(aggregate.totalPickups, aggregate.totalPulls)}
        />
        <Metric
          label={t("tools.recruitment.averagePullsPerPU")}
          value={average(aggregate.totalPulls, aggregate.totalPickups)}
        />
        <Metric
          label={t("tools.recruitment.totalRebatePulls")}
          value={aggregate.rebatePulls}
        />
        <Metric
          label={t("tools.recruitment.pyroxenesSaved")}
          value={aggregate.pyroxenesSaved.toLocaleString()}
        />
        <Metric
          label={t("tools.recruitment.softPityRecord")}
          value={`${aggregate.softPityWins}/${aggregate.softPityLosses}`}
        />
        <Metric
          label={t("tools.recruitment.softPityWinRate")}
          value={rate(
            aggregate.softPityWins,
            aggregate.softPityWins + aggregate.softPityLosses,
          )}
        />
        <Metric
          label={t("tools.recruitment.hardPityCount")}
          value={aggregate.hardPities}
        />
        <Metric
          label={t("tools.recruitment.hardPityPUPercent")}
          value={rate(aggregate.hardPityPickups, aggregate.totalPickups)}
        />
      </div>
      <div className="grid w-full gap-4">
        <PitySummary aggregate={aggregate} />
        <PickupDistributionChart aggregate={aggregate} />
      </div>
    </section>
  );
}

function PitySummary({ aggregate }: { aggregate: AggregateBucket }) {
  const t = useTranslations();
  const values: {
    key: "beforeSoftPity" | "softWin" | "afterSoftPity" | "hardPity";
    value: number;
    color: string;
  }[] = [
    {
      key: "beforeSoftPity",
      value: aggregate.naturalPickups,
      color: PITY_COLORS.beforeSoftPity,
    },
    {
      key: "softWin",
      value: aggregate.softWinPickups,
      color: PITY_COLORS.softWin,
    },
    {
      key: "afterSoftPity",
      value: aggregate.softLossPickups,
      color: PITY_COLORS.afterSoftPity,
    },
    {
      key: "hardPity",
      value: aggregate.hardPityPickups,
      color: PITY_COLORS.hardPity,
    },
  ];
  const total = values.reduce((sum, item) => sum + item.value, 0);

  return (
    <ChartCard title={t("tools.recruitment.pitySummary")}>
      {total === 0 ? (
        <EmptyChart />
      ) : (
        <div className="grid gap-4">
          <div className="flex h-8 overflow-hidden rounded-full bg-muted">
            {values.map(
              (item) =>
                item.value > 0 && (
                  <div
                    key={item.key}
                    style={{
                      width: `${(item.value / total) * 100}%`,
                      backgroundColor: item.color,
                    }}
                  />
                ),
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {values.map((item) => (
              <div className="flex items-center gap-2" key={item.key}>
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span>
                  {classificationLabel(t, item.key)}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}

function classificationLabel(
  t: ReturnType<typeof useTranslations>,
  key: "beforeSoftPity" | "softWin" | "afterSoftPity" | "hardPity",
) {
  return t(`tools.recruitment.classifications.${key}` as never);
}

function chargeBucketColor(start: number) {
  const end = start + 9;
  if (end < SOFT_PITY) return PITY_COLORS.beforeSoftPity;
  if (start <= SOFT_PITY && end >= SOFT_PITY) return PITY_COLORS.softWin;
  if (end < HARD_PITY) return PITY_COLORS.afterSoftPity;
  return PITY_COLORS.hardPity;
}

function PickupDistributionChart({
  aggregate,
}: { aggregate: AggregateBucket }) {
  const t = useTranslations();
  const data = Array.from({ length: 20 }, (_, index) => {
    const start = index * 10 + 1;
    const count = aggregate.pickupChargeHistogram
      .slice(start, start + 10)
      .reduce((sum, value) => sum + value, 0);
    return { charge: start, count };
  });

  return (
    <ChartCard title={t("tools.recruitment.pickupDistribution")}>
      <ChartContainer
        config={{
          count: {
            label: t("tools.recruitment.pickups"),
            color: PITY_COLORS.afterSoftPity,
          },
        }}
      >
        <BarChart accessibilityLayer data={data} margin={{ left: 8, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="charge"
            tickFormatter={(charge) => String(Number(charge) + 9)}
            tickLine={false}
            axisLine={false}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_value, tooltipPayload) => {
                  const charge = Number(tooltipPayload?.[0]?.payload?.charge);
                  if (!Number.isFinite(charge)) return "";
                  return `${charge}-${charge + 9}`;
                }}
              />
            }
          />
          <ReferenceLine
            x={SOFT_PITY}
            stroke={PITY_COLORS.softWin}
            strokeDasharray="4 4"
          />
          <ReferenceLine
            x={HARD_PITY}
            stroke={PITY_COLORS.hardPity}
            strokeDasharray="4 4"
          />
          <Bar dataKey="count" radius={2}>
            {data.map((entry) => (
              <Cell
                fill={chargeBucketColor(entry.charge)}
                key={entry.charge}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

function ChartCard({
  title,
  children,
}: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function EmptyChart() {
  const t = useTranslations();
  return (
    <div className="flex aspect-video items-center justify-center text-sm text-muted-foreground">
      {t("tools.recruitment.noAnalyticsData")}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function rate(numerator: number, denominator: number) {
  return denominator === 0
    ? "N/A"
    : `${((numerator / denominator) * 100).toFixed(2)}%`;
}

function average(numerator: number, denominator: number) {
  return denominator === 0 ? "N/A" : (numerator / denominator).toFixed(2);
}

function emptyBucket(): AggregateBucket {
  return {
    sessionCount: 0,
    totalPulls: 0,
    paidPulls: 0,
    totalThreeStars: 0,
    totalPickups: 0,
    rebatePulls: 0,
    pyroxenesSaved: 0,
    softPityWins: 0,
    softPityLosses: 0,
    hardPities: 0,
    naturalPickups: 0,
    softWinPickups: 0,
    softLossPickups: 0,
    hardPityPickups: 0,
    pickupChargeHistogram: Array.from({ length: 201 }, () => 0),
  };
}

function aggregateForFilter(aggregates: AccountAggregates, filter: Filter) {
  if (filter === "permanent") return aggregates.permanent;
  if (filter === "fest") return aggregates.fest;
  if (filter === "limited")
    return mergeBuckets(aggregates.limited, aggregates.fest);
  return mergeBuckets(
    mergeBuckets(aggregates.permanent, aggregates.limited),
    aggregates.fest,
  );
}

function mergeBuckets(first: AggregateBucket, second: AggregateBucket) {
  const result = emptyBucket();
  for (const key of Object.keys(result) as (keyof AggregateBucket)[]) {
    if (key === "pickupChargeHistogram") {
      result[key] = first[key].map(
        (value, index) => value + second[key][index],
      );
    } else {
      result[key] = first[key] + second[key];
    }
  }
  return result;
}

function rebuildAggregate(sessions: Session[]) {
  let result = emptyAccountAggregates();
  for (const session of sessions) {
    const stats = calculateRecruitmentStats(session);
    result = applySessionToAggregates(result, session, stats, 1);
  }
  return result;
}
