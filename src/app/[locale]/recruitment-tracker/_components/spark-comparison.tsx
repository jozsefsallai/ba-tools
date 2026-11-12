"use client";

import { InfoIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  Readout,
  type ReadoutItem,
} from "@/app/[locale]/recruitment-tracker/_components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FEST_THREE_STAR_RATE,
  SPARK_COST,
  SPARK_PICKUP_RATE,
  type SparkSystemComparison,
  type SparkSystemExpectation,
  THREE_STAR_RATE,
} from "@/lib/recruitment";
import { cn } from "@/lib/utils";

const SparkFormula = dynamic(
  () =>
    import("@/app/[locale]/recruitment-tracker/_components/spark-formula").then(
      (module) => module.SparkFormula,
    ),
  {
    ssr: false,
  },
);

function rate(value: number): string {
  return String(Number(value.toFixed(4)));
}

const PU = rate(SPARK_PICKUP_RATE);
const NOT_PU = rate(1 - SPARK_PICKUP_RATE);
const THREE_STAR = rate(THREE_STAR_RATE);
const NOT_THREE_STAR = rate(1 - THREE_STAR_RATE);
const FEST_THREE_STAR = rate(FEST_THREE_STAR_RATE);
const OFF_RATE = rate(THREE_STAR_RATE - SPARK_PICKUP_RATE);

const FORMULAS = {
  needed: String.raw`\begin{aligned}
S &= \left\lfloor \frac{N}{${SPARK_COST}} \right\rfloor \\
a &= \max(0,\ \text{PU} - S) \\
t &= \max(0,\ 3\bigstar - S)
\end{aligned}`,
  pickups: String.raw`P(\text{PU} \ge a) = 1 - \sum_{i=0}^{a-1} \binom{N}{i}\, ${PU}^{\,i}\, ${NOT_PU}^{\,N-i}`,
  threeStars: String.raw`P(3\bigstar \ge t) = 1 - \sum_{i=0}^{t-1} \binom{N}{i}\, ${THREE_STAR}^{\,i}\, ${NOT_THREE_STAR}^{\,N-i}`,
  outcome: String.raw`p(i, j) = \frac{N!}{i!\, j!\, (N-i-j)!}\; ${PU}^{\,i}\; ${OFF_RATE}^{\,j}\; ${NOT_THREE_STAR}^{\,N-i-j}`,
  expectedSpark: String.raw`\begin{aligned}
S &= \sum_{s} \left\lfloor \frac{N_s}{${SPARK_COST}} \right\rfloor \\
E[\text{PU}] &= ${PU}\,N + S \\
E[3\bigstar] &= ${THREE_STAR}\,N_r + ${FEST_THREE_STAR}\,N_f + S
\end{aligned}`,
  expectedCharge: String.raw`E[3\bigstar] = E[\text{PU}] + E[L] + \bigl(n - E[\text{PU}] - E[L]\bigr) \cdot \frac{r - ${PU}}{1 - ${PU}}`,
  combined: String.raw`P(\text{both}) = 1 - P(\text{PU} < a) - \sum_{\substack{i \ge a \\ i+j < t}} p(i, j)`,
};

function formatOdds(odds: number): string {
  const percentage = odds * 100;

  if (percentage > 0 && percentage < 0.01) {
    return "<0.01%";
  }

  if (percentage < 100 && percentage > 99.99) {
    return ">99.99%";
  }

  return `${percentage.toFixed(2)}%`;
}

const ODDS_ROWS = [
  "threeStars",
  "pickups",
  "combined",
] as const;

const SAME_ODDS_MARGIN = 0.005;

function oddsColor(odds: number): string {
  if (odds < 1 / 3) {
    return "text-rose-600 dark:text-rose-400";
  }

  if (odds < 2 / 3) {
    return "text-amber-600 dark:text-amber-400";
  }

  return "text-emerald-600 dark:text-emerald-400";
}

function betterColor(odds: number, otherOdds: number): string | undefined {
  const difference = (odds - otherOdds) * 100;

  if (Math.abs(difference) < SAME_ODDS_MARGIN) {
    return undefined;
  }

  return difference > 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";
}

type OddsValueProps = {
  spark: number;
  charge: number;
};

function OddsValue({ spark, charge }: OddsValueProps) {
  const t = useTranslations("tools.recruitment.spark");

  const difference = (charge - spark) * 100;

  const outcome =
    Math.abs(difference) < SAME_ODDS_MARGIN
      ? "same"
      : difference > 0
        ? "better"
        : "worse";

  const color = {
    same: "text-muted-foreground",
    better: "text-emerald-600 dark:text-emerald-400",
    worse: "text-rose-600 dark:text-rose-400",
  }[outcome];

  return (
    <>
      <span className={oddsColor(spark)}>{formatOdds(spark)}</span>

      <span className={cn("block text-xs font-normal", color)}>
        {t("chargeDifference", {
          outcome,
          difference: Math.abs(difference).toFixed(2),
        })}
      </span>
    </>
  );
}

type SparkComparisonProps = {
  comparison: SparkSystemComparison;
};

export function SparkComparison({ comparison }: SparkComparisonProps) {
  const t = useTranslations("tools.recruitment.spark");

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t("title")}</h3>

        <Methodology scope="session">
          <SessionMethodology comparison={comparison} />
        </Methodology>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("intro", {
          count: comparison.paidPulls,
        })}
      </p>

      <Readout
        items={ODDS_ROWS.map((row) => ({
          label: t(row, {
            count:
              row === "threeStars"
                ? comparison.threeStarCount
                : comparison.pickupCount,
          }),
          value: (
            <OddsValue
              spark={comparison.sparkOdds[row]}
              charge={comparison.chargeOdds[row]}
            />
          ),
        }))}
      />
    </div>
  );
}

const EXPECTATION_ROWS = [
  {
    row: "pickups",
    label: "rowPickups",
    recruited: "pickupCount",
  },
  {
    row: "threeStars",
    label: "rowThreeStars",
    recruited: "threeStarCount",
  },
] as const;

function formatAverage(count: number): string {
  return count.toFixed(1);
}

type SparkExpectationProps = {
  expectation: SparkSystemExpectation;
};

export function SparkExpectation({ expectation }: SparkExpectationProps) {
  const t = useTranslations("tools.recruitment.spark");

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{t("accountTitle")}</h3>

        <Methodology scope="account">
          <AccountMethodology expectation={expectation} />
        </Methodology>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("accountIntro", {
          count: expectation.paidPulls,
          sessions: expectation.sessionCount,
        })}
      </p>

      <table className="mt-2 w-full text-sm tabular-nums">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th />
            <th className="pb-1.5 text-right font-normal">{t("recruited")}</th>
            <th className="pb-1.5 text-right font-normal">
              {t("sparkAverage")}
            </th>
            <th className="pb-1.5 text-right font-normal">
              {t("chargeAverage")}
            </th>
          </tr>
        </thead>

        <tbody>
          {EXPECTATION_ROWS.map(({ row, label, recruited }) => {
            const spark = expectation.sparkExpected[row];
            const charge = expectation.chargeExpected[row];

            return (
              <tr className="border-b last:border-b-0" key={row}>
                <th className="py-1.5 text-left font-normal text-muted-foreground">
                  {t(label)}
                </th>

                <td className="py-1.5 text-right font-medium">
                  {expectation[recruited]}
                </td>

                <td
                  className={cn(
                    "py-1.5 text-right font-medium",
                    betterColor(spark, charge),
                  )}
                >
                  {formatAverage(spark)}
                </td>

                <td
                  className={cn(
                    "py-1.5 text-right font-medium",
                    betterColor(charge, spark),
                  )}
                >
                  {formatAverage(charge)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type Scope = "session" | "account";

type MethodologyProps = {
  scope: Scope;
  children: ReactNode;
};

function Methodology({ scope, children }: MethodologyProps) {
  const t = useTranslations("tools.recruitment.spark");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={t("methodology")}>
          <InfoIcon />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("methodology")}</DialogTitle>
          <DialogDescription>
            {t("methodologyDescription", {
              scope,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 text-sm">
          <section className="flex flex-col gap-2">
            <h4 className="font-semibold">{t("assumptions")}</h4>

            <ul className="flex list-disc flex-col gap-1 pl-5">
              <li>{t("assumptionPaidPulls")}</li>
              <li>{t("assumptionPickupRate")}</li>
              <li>{t("assumptionThreeStarRate")}</li>
              <li>{t("assumptionPoints")}</li>
              <li>{t("assumptionSpark")}</li>
            </ul>

            <p className="text-muted-foreground">{t("caveat")}</p>
          </section>

          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type ChargeRulesProps = {
  scope: Scope;
};

function ChargeRules({ scope }: ChargeRulesProps) {
  const t = useTranslations("tools.recruitment.spark");

  return (
    <>
      <p>
        {t("chargeIntro", {
          scope,
        })}
      </p>

      <ul className="flex list-disc flex-col gap-1 pl-5">
        <li>
          {t("chargePulls", {
            scope,
          })}
        </li>
        <li>{t("chargeRates")}</li>
        <li>{t("chargeSoftPity")}</li>
        <li>{t("chargeHardPity")}</li>
        <li>{t("chargeReset")}</li>
      </ul>
    </>
  );
}

function pullValues(
  t: ReturnType<typeof useTranslations<"tools.recruitment.spark">>,
  expectation: SparkSystemExpectation,
): ReadoutItem[] {
  return [
    {
      label: t("valuePaidPulls"),
      value: expectation.paidPulls,
    },
    ...(expectation.ratePulls.fest > 0
      ? [
          {
            label: t("valueSplit"),
            value: `${expectation.ratePulls.regular} / ${expectation.ratePulls.fest}`,
          },
        ]
      : []),
    {
      label: t("valueSparks"),
      value: expectation.sparks,
    },
  ];
}

function SessionMethodology({ comparison }: SparkComparisonProps) {
  const t = useTranslations("tools.recruitment.spark");

  return (
    <>
      <section className="flex flex-col gap-2">
        <h4 className="font-semibold">{t("formulas")}</h4>

        <p>{t("formulaNeeded")}</p>
        <SparkFormula tex={FORMULAS.needed} />

        <p>{t("formulaPickups")}</p>
        <SparkFormula tex={FORMULAS.pickups} />

        <p>{t("formulaThreeStars")}</p>
        <SparkFormula tex={FORMULAS.threeStars} />
        <p className="text-muted-foreground">{t("formulaFest")}</p>

        <p>{t("formulaCombined")}</p>
        <SparkFormula tex={FORMULAS.outcome} />

        <p>{t("formulaCombinedResult")}</p>
        <SparkFormula tex={FORMULAS.combined} />
      </section>

      <section className="flex flex-col gap-2">
        <h4 className="font-semibold">{t("charge")}</h4>

        <ChargeRules scope="session" />

        <p>{t("chargeMethod")}</p>
        <p>{t("chargeDifferenceNote")}</p>
      </section>

      <section className="flex flex-col gap-1">
        <h4 className="font-semibold">
          {t("values", {
            scope: "session",
          })}
        </h4>

        <Readout
          items={[
            ...pullValues(t, comparison),
            {
              label: t("valueNeededPickups"),
              value: comparison.neededPickups,
            },
            {
              label: t("valueNeededThreeStars"),
              value: comparison.neededThreeStars,
            },
            ...ODDS_ROWS.flatMap((row) => {
              const spark = comparison.sparkOdds[row];
              const charge = comparison.chargeOdds[row];

              return [
                {
                  label: t("valueSparkOdds", {
                    row,
                  }),
                  value: (
                    <span className={betterColor(spark, charge)}>
                      {formatOdds(spark)}
                    </span>
                  ),
                },
                {
                  label: t("valueChargeOdds", {
                    row,
                  }),
                  value: (
                    <span className={betterColor(charge, spark)}>
                      {formatOdds(charge)}
                    </span>
                  ),
                },
              ];
            }),
          ]}
        />
      </section>
    </>
  );
}

function AccountMethodology({ expectation }: SparkExpectationProps) {
  const t = useTranslations("tools.recruitment.spark");

  return (
    <>
      <section className="flex flex-col gap-2">
        <h4 className="font-semibold">{t("formulas")}</h4>

        <p>{t("expectedSpark")}</p>
        <SparkFormula tex={FORMULAS.expectedSpark} />
        <p className="text-muted-foreground">{t("expectedSparkRates")}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h4 className="font-semibold">{t("charge")}</h4>

        <ChargeRules scope="account" />

        <p>{t("expectedCharge")}</p>
        <SparkFormula tex={FORMULAS.expectedCharge} />
      </section>

      <section className="flex flex-col gap-1">
        <h4 className="font-semibold">
          {t("values", {
            scope: "account",
          })}
        </h4>

        <Readout
          items={[
            {
              label: t("valueSessions"),
              value: expectation.sessionCount,
            },
            ...pullValues(t, expectation),
            ...EXPECTATION_ROWS.flatMap(({ row }) => {
              const spark = expectation.sparkExpected[row];
              const charge = expectation.chargeExpected[row];

              return [
                {
                  label: t("valueSparkExpected", {
                    row,
                  }),
                  value: (
                    <span className={betterColor(spark, charge)}>
                      {formatAverage(spark)}
                    </span>
                  ),
                },
                {
                  label: t("valueChargeExpected", {
                    row,
                  }),
                  value: (
                    <span className={betterColor(charge, spark)}>
                      {formatAverage(charge)}
                    </span>
                  ),
                },
              ];
            }),
          ]}
        />
      </section>
    </>
  );
}
