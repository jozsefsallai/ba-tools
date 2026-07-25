"use client";

import expNImage from "@/app/student-exp-calculator/_assets/exp_n.webp";
import expRImage from "@/app/student-exp-calculator/_assets/exp_r.webp";
import expSrImage from "@/app/student-exp-calculator/_assets/exp_sr.webp";
import expSsrImage from "@/app/student-exp-calculator/_assets/exp_ssr.webp";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { studentExpStorage } from "@/lib/storage/student-exp";
import {
  type ReportCounts,
  type ReportRarity,
  calculateStudentExpCapacity,
} from "@/lib/student-exp-table";
import { useTranslations } from "next-intl";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const MIN_LEVEL = 1;
const MAX_LEVEL = 90;

const REPORT_INPUTS = [
  { rarity: "N", labelKey: "n", image: expNImage },
  { rarity: "R", labelKey: "r", image: expRImage },
  { rarity: "SR", labelKey: "sr", image: expSrImage },
  { rarity: "SSR", labelKey: "ssr", image: expSsrImage },
] as const satisfies {
  rarity: ReportRarity;
  labelKey: string;
  image: StaticImageData;
}[];

const DEFAULT_REPORTS: Record<ReportRarity, string> = {
  N: "",
  R: "",
  SR: "",
  SSR: "",
};

function parseNonNegativeInt(value: string): number {
  const parsed = Number.parseInt(value.replace(/,/g, ""), 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

function isReportCountsRecord(
  value: unknown,
): value is Record<ReportRarity, string> {
  if (!value || typeof value !== "object") {
    return false;
  }

  return REPORT_INPUTS.every(({ rarity }) => {
    const entry = (value as Record<string, unknown>)[rarity];
    return typeof entry === "string";
  });
}

export function StudentExpCalculator() {
  const t = useTranslations();

  const [reports, setReports] =
    useState<Record<ReportRarity, string>>(DEFAULT_REPORTS);
  const [levelRange, setLevelRange] = useState<[number, number]>([
    MIN_LEVEL,
    MAX_LEVEL,
  ]);
  const [hydrated, setHydrated] = useState(false);

  const [fromLevel, toLevel] = levelRange;

  useEffect(() => {
    const saved = studentExpStorage.get();
    if (saved) {
      if (isReportCountsRecord(saved.reports)) {
        setReports(saved.reports);
      }
      setLevelRange([saved.fromLevel, saved.toLevel]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    studentExpStorage.set({
      reports,
      fromLevel,
      toLevel,
    });
  }, [reports, fromLevel, toLevel, hydrated]);

  const result = useMemo(() => {
    const counts: ReportCounts = {
      N: parseNonNegativeInt(reports.N),
      R: parseNonNegativeInt(reports.R),
      SR: parseNonNegativeInt(reports.SR),
      SSR: parseNonNegativeInt(reports.SSR),
    };

    return calculateStudentExpCapacity(counts, fromLevel, toLevel);
  }, [reports, fromLevel, toLevel]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,22rem)_1fr] gap-8 lg:gap-10 items-start">
      <div className="flex flex-col gap-5">
        {REPORT_INPUTS.map(({ rarity, labelKey, image }) => (
          <div key={rarity} className="flex gap-4 items-start">
            <Image
              src={image}
              alt=""
              width={64}
              height={64}
              className="size-16 shrink-0 object-contain"
            />
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              <Label htmlFor={`report-${rarity}`}>
                {t(`tools.studentExp.reports.${labelKey}.label`)}
              </Label>
              <Input
                id={`report-${rarity}`}
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="0"
                value={reports[rarity]}
                onChange={(e) =>
                  setReports((prev) => ({
                    ...prev,
                    [rarity]: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-3 pt-1">
          <Label>{t("tools.studentExp.levelRange.label")}</Label>
          <div className="flex justify-between text-sm tabular-nums">
            <span>
              {t("tools.studentExp.levelRange.from", { level: fromLevel })}
            </span>
            <span>
              {t("tools.studentExp.levelRange.to", { level: toLevel })}
            </span>
          </div>
          <Slider
            min={MIN_LEVEL}
            max={MAX_LEVEL}
            step={1}
            value={levelRange}
            onValueChange={(value) => {
              const [nextFrom, nextTo] = value;
              if (nextFrom === undefined || nextTo === undefined) {
                return;
              }
              setLevelRange([nextFrom, nextTo]);
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">
          {t("tools.studentExp.results.title")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ResultStat
            label={t("tools.studentExp.results.students")}
            value={result.students.toLocaleString("en-US")}
          />
          <ResultStat
            label={t("tools.studentExp.results.expPerStudent")}
            value={result.expPerStudent.toLocaleString("en-US")}
          />
          <ResultStat
            label={t("tools.studentExp.results.totalExp")}
            value={result.totalExp.toLocaleString("en-US")}
          />
          <ResultStat
            label={t("tools.studentExp.results.leftoverExp")}
            value={result.leftoverExp.toLocaleString("en-US")}
          />
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-medium">
            {t("tools.studentExp.results.leftoverReports")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {REPORT_INPUTS.map(({ rarity, labelKey, image }) => (
              <div
                key={rarity}
                className="flex flex-col items-center gap-2 rounded-md border p-3 text-center"
              >
                <Image
                  src={image}
                  alt=""
                  width={56}
                  height={56}
                  className="size-14 object-contain"
                />
                <div className="text-xs text-muted-foreground">
                  {t(`tools.studentExp.reports.${labelKey}.short`)}
                </div>
                <div className="text-xl font-semibold tabular-nums">
                  {result.leftoverReports[rarity].toLocaleString("en-US")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
