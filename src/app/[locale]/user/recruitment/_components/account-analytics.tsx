"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Readout } from "@/app/[locale]/user/recruitment/_components/shared";
import type { SessionWithStats } from "@/app/[locale]/user/recruitment/_components/types";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  type AccountAggregates,
  type AggregateBucket,
  applySessionToAggregates,
  calculateRecruitmentStats,
  emptyAccountAggregates,
  emptyAggregateBucket,
  HARD_PITY,
  SOFT_PITY,
} from "@/lib/recruitment";

const FILTERS = [
  "all",
  "permanent",
  "limited",
  "fest",
] as const;

type Filter = (typeof FILTERS)[number];

const PITY_COLORS = {
  beforeSoftPity: "#22c55e",
  softWin: "#a3e635",
  afterSoftPity: "#f59e0b",
  hardPity: "#ef4444",
} as const;

/** Each pity result with the bucket field that counts it, in the order they are drawn. */
const PITY_RESULTS = [
  {
    classification: "beforeSoftPity",
    counter: "naturalPickups",
  },
  {
    classification: "softWin",
    counter: "softWinPickups",
  },
  {
    classification: "afterSoftPity",
    counter: "softLossPickups",
  },
  {
    classification: "hardPity",
    counter: "hardPityPickups",
  },
] as const;

const HISTOGRAM_BIN_SIZE = 10;

function mergeBuckets(...buckets: AggregateBucket[]): AggregateBucket {
  const result = emptyAggregateBucket();

  for (const bucket of buckets) {
    for (const key of Object.keys(result) as (keyof AggregateBucket)[]) {
      if (key === "pickupChargeHistogram") {
        result[key] = result[key].map(
          (count, charge) => count + bucket[key][charge],
        );
      } else {
        result[key] += bucket[key];
      }
    }
  }

  return result;
}

function bucketForFilter(
  { permanent, limited, fest }: AccountAggregates,
  filter: Filter,
): AggregateBucket {
  switch (filter) {
    case "permanent":
      return permanent;
    case "fest":
      return fest;
    case "limited":
      return mergeBuckets(limited, fest);
    default:
      return mergeBuckets(permanent, limited, fest);
  }
}

/** Aggregates worked out from the sessions, for accounts saved before they were stored. */
function aggregateSessions(sessions: SessionWithStats[]): AccountAggregates {
  return sessions.reduce(
    (aggregates, session) =>
      applySessionToAggregates(
        aggregates,
        session,
        calculateRecruitmentStats(session),
        1,
      ),
    emptyAccountAggregates(),
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

type AccountAnalyticsProps = {
  sessions: SessionWithStats[];
  aggregates?: AccountAggregates;
};

export function AccountAnalytics({
  sessions,
  aggregates,
}: AccountAnalyticsProps) {
  const t = useTranslations();
  const [filter, setFilter] = useState<Filter>("all");

  const source = useMemo(
    () => aggregates ?? aggregateSessions(sessions),
    [
      aggregates,
      sessions,
    ],
  );

  const bucket = bucketForFilter(source, filter);

  // Fest banners double the 3★ rate, so their rate is shown apart from the rest.
  const regular =
    filter === "permanent"
      ? source.permanent
      : filter === "fest"
        ? emptyAggregateBucket()
        : mergeBuckets(source.permanent, source.limited);

  const fest = filter === "permanent" ? emptyAggregateBucket() : source.fest;

  return (
    <section className="grid w-full gap-4">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={filter}
        onValueChange={(value) => {
          if (value) {
            setFilter(value as Filter);
          }
        }}
      >
        {FILTERS.map((value) => (
          <ToggleGroupItem className="flex-none px-3" key={value} value={value}>
            {t(`tools.recruitment.filters.${value}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <Readout
        className="gap-x-10 border-t sm:columns-2"
        items={[
          {
            label: t("tools.recruitment.regularThreeStarRate"),
            value: rate(regular.totalThreeStars, regular.totalPulls),
          },
          {
            label: t("tools.recruitment.festThreeStarRate"),
            value: rate(fest.totalThreeStars, fest.totalPulls),
          },
          {
            label: t("tools.recruitment.accountPURate"),
            value: rate(bucket.totalPickups, bucket.totalPulls),
          },
          {
            label: t("tools.recruitment.averagePullsPerPU"),
            value: average(bucket.totalPulls, bucket.totalPickups),
          },
          {
            label: t("tools.recruitment.totalRebatePulls"),
            value: bucket.rebatePulls,
          },
          {
            label: t("tools.recruitment.pyroxenesSaved"),
            value: bucket.pyroxenesSaved.toLocaleString(),
          },
          {
            label: t("tools.recruitment.softPityRecord"),
            value: `${bucket.softPityWins}/${bucket.softPityLosses}`,
          },
          {
            label: t("tools.recruitment.softPityWinRate"),
            value: rate(
              bucket.softPityWins,
              bucket.softPityWins + bucket.softPityLosses,
            ),
          },
          {
            label: t("tools.recruitment.hardPityCount"),
            value: bucket.hardPities,
          },
          {
            label: t("tools.recruitment.hardPityPUPercent"),
            value: rate(bucket.hardPityPickups, bucket.totalPickups),
          },
        ]}
      />

      <div className="grid w-full items-start gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <PitySummary bucket={bucket} />
        <PickupDistributionChart bucket={bucket} />
      </div>
    </section>
  );
}

type BucketProps = {
  bucket: AggregateBucket;
};

function PitySummary({ bucket }: BucketProps) {
  const t = useTranslations();

  const results = PITY_RESULTS.map(({ classification, counter }) => ({
    classification,
    count: bucket[counter],
    color: PITY_COLORS[classification],
  }));

  const total = results.reduce((sum, result) => sum + result.count, 0);

  return (
    <ChartCard title={t("tools.recruitment.pitySummary")}>
      {total === 0 ? (
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
          {t("tools.recruitment.noAnalyticsData")}
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="flex h-6 overflow-hidden bg-muted">
            {results.map(
              (result) =>
                result.count > 0 && (
                  <div
                    key={result.classification}
                    style={{
                      width: `${(result.count / total) * 100}%`,
                      backgroundColor: result.color,
                    }}
                  />
                ),
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {results.map((result) => (
              <div
                className="flex items-center gap-2"
                key={result.classification}
              >
                <span
                  className="size-2.5"
                  style={{
                    backgroundColor: result.color,
                  }}
                />

                <span>
                  {t(
                    `tools.recruitment.classifications.${result.classification}`,
                  )}
                  : {result.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}

/** The colour of the pity result that pick-ups in the bin starting at `start` count as. */
function binColor(start: number) {
  const end = start + HISTOGRAM_BIN_SIZE - 1;

  if (end < SOFT_PITY) {
    return PITY_COLORS.beforeSoftPity;
  }

  if (start <= SOFT_PITY && end >= SOFT_PITY) {
    return PITY_COLORS.softWin;
  }

  if (end < HARD_PITY) {
    return PITY_COLORS.afterSoftPity;
  }

  return PITY_COLORS.hardPity;
}

function PickupDistributionChart({ bucket }: BucketProps) {
  const t = useTranslations();

  const bins = Array.from(
    {
      length: HARD_PITY / HISTOGRAM_BIN_SIZE,
    },
    (_, index) => {
      const start = index * HISTOGRAM_BIN_SIZE + 1;

      return {
        charge: start,
        count: bucket.pickupChargeHistogram
          .slice(start, start + HISTOGRAM_BIN_SIZE)
          .reduce((sum, count) => sum + count, 0),
      };
    },
  );

  return (
    <ChartCard title={t("tools.recruitment.pickupDistribution")}>
      <ChartContainer
        className="aspect-auto h-72 w-full"
        config={{
          count: {
            label: t("tools.recruitment.pickups"),
            color: PITY_COLORS.afterSoftPity,
          },
        }}
      >
        <BarChart
          accessibilityLayer
          data={bins}
          margin={{
            left: 8,
            right: 8,
          }}
        >
          <CartesianGrid vertical={false} />

          <XAxis
            dataKey="charge"
            tickFormatter={(charge) =>
              String(Number(charge) + HISTOGRAM_BIN_SIZE - 1)
            }
            tickLine={false}
            axisLine={false}
          />

          <YAxis allowDecimals={false} tickLine={false} axisLine={false} />

          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_value, payload) => {
                  const charge = Number(payload?.[0]?.payload?.charge);

                  return Number.isFinite(charge)
                    ? `${charge}-${charge + HISTOGRAM_BIN_SIZE - 1}`
                    : "";
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
            {bins.map((bin) => (
              <Cell fill={binColor(bin.charge)} key={bin.charge} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

type ChartCardProps = {
  title: string;
  children: ReactNode;
};

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="rounded-md border p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {children}
    </div>
  );
}
