"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  HARD_PITY,
  RECRUITMENT_COLORS,
  type RecruitmentKind,
  type RecruitmentSessionKind,
  SOFT_PITY,
} from "@/lib/recruitment";
import { cn } from "@/lib/utils";

export function poolColors(kind: RecruitmentKind) {
  return kind === "limited"
    ? RECRUITMENT_COLORS.limited
    : RECRUITMENT_COLORS.base;
}

/** The colour dot that stands for a banner type. */
export function PoolMark({
  kind,
  className,
}: {
  kind: RecruitmentKind;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{
        backgroundColor: poolColors(kind).accent,
      }}
    />
  );
}

export function ChargeGauge({
  kind,
  value,
  label,
  compact = false,
  className,
}: {
  kind: RecruitmentKind;
  value: number;
  label?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations();
  const colors = poolColors(kind);
  const hint =
    value >= HARD_PITY
      ? t("tools.recruitment.atHardPity")
      : value < SOFT_PITY
        ? t("tools.recruitment.toSoftPity", {
            count: SOFT_PITY - value,
          })
        : t("tools.recruitment.toHardPity", {
            count: HARD_PITY - value,
          });

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <PoolMark kind={kind} />
            <span className="truncate">
              {label ?? t(`tools.recruitment.${kind}`)}
            </span>
          </div>
          {!compact && (
            <div className="text-xs text-muted-foreground">{hint}</div>
          )}
        </div>
        <div className="shrink-0 font-nexon-football-gothic leading-none">
          <span className={compact ? "text-xl" : "text-3xl"}>{value}</span>
          <span className="text-sm text-muted-foreground">/{HARD_PITY}</span>
        </div>
      </div>
      <div
        className="relative my-1.5 h-2.5 rounded-full bg-[#d4d4d4]/45 dark:bg-[#d4d4d4]/20"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={HARD_PITY}
        aria-valuenow={value}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, (value / HARD_PITY) * 100)}%`,
            backgroundColor: colors.trackAccent,
          }}
        />
        <Milestone
          className="left-1/2 -translate-x-1/2"
          kind={kind}
          reached={value >= SOFT_PITY}
          value={SOFT_PITY}
        />
        <Milestone
          className="right-0"
          kind={kind}
          reached={value >= HARD_PITY}
          value={HARD_PITY}
        />
      </div>
    </div>
  );
}

function Milestone({
  kind,
  value,
  reached,
  className,
}: {
  kind: RecruitmentKind;
  value: number;
  reached: boolean;
  className: string;
}) {
  const colors = poolColors(kind);
  return (
    <span
      className={cn(
        "absolute top-1/2 -translate-y-1/2 rounded-full border-2 bg-background px-2 text-[11px] leading-4 font-medium tabular-nums",
        className,
      )}
      style={{
        borderColor: reached
          ? colors.labelBorderActive
          : RECRUITMENT_COLORS.labelBorder,
        color: reached ? colors.labelTextActive : RECRUITMENT_COLORS.labelText,
      }}
    >
      {value}
    </span>
  );
}

export function SessionKindLabel({
  kind,
  isFestBanner,
  className,
}: {
  kind: RecruitmentSessionKind;
  isFestBanner?: boolean;
  className?: string;
}) {
  const t = useTranslations();

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      style={{
        color: kind === "mixed" ? undefined : poolColors(kind).labelTextActive,
      }}
    >
      <span className="inline-flex gap-0.5">
        {kind !== "limited" && <PoolMark kind="permanent" />}
        {kind !== "permanent" && <PoolMark kind="limited" />}
      </span>
      {kind === "mixed"
        ? t("tools.recruitment.mixed")
        : isFestBanner
          ? t("tools.recruitment.festLimited")
          : t(`tools.recruitment.${kind}`)}
    </span>
  );
}

export type ReadoutItem = {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
};

export function Readout({
  items,
  className,
}: {
  items: ReadoutItem[];
  className?: string;
}) {
  return (
    <dl className={cn("text-sm", className)}>
      {items.map((item, index) => (
        <div
          key={index}
          className="flex break-inside-avoid items-baseline justify-between gap-4 border-b py-1.5"
        >
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="text-right font-medium tabular-nums">
            {item.detail !== undefined && (
              <span className="mr-2 text-xs font-normal text-muted-foreground">
                {item.detail}
              </span>
            )}
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border px-4 py-12 text-center">
      <div className="text-lg font-medium">{title}</div>
      {description && (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action}
    </div>
  );
}

export function formatRate(numerator: number, denominator: number) {
  return denominator === 0
    ? "—"
    : `${((numerator / denominator) * 100).toFixed(2)}%`;
}
