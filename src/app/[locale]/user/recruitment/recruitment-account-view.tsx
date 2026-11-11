"use client";

import { useQuery } from "convex/react";
import { ArrowRightIcon, PlusIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import {
  EmptyState,
  PoolMark,
  SessionKindLabel,
} from "@/app/[locale]/user/recruitment/_components/shared";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { RecruitmentKind } from "@/lib/recruitment";
import { buildStudentIconUrlFromId } from "@/lib/url";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

const COLUMNS =
  "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_5.5rem_5.5rem_9rem_minmax(0,1fr)]";

/** The account's session log. The header around it is `RecruitmentAccountShell`. */
export function RecruitmentAccountView({ accountId }: { accountId: string }) {
  const t = useTranslations();
  const format = useFormatter();
  const result = useQuery(api.recruitment.getAccount, {
    accountId: accountId as Id<"recruitmentAccount">,
  });

  if (!result) {
    return null;
  }

  if (result.sessions.length === 0) {
    return (
      <EmptyState
        title={t("tools.recruitment.noSessions")}
        description={t("tools.recruitment.noSessionsHint")}
        action={
          <Button asChild>
            <Link href={`/user/recruitment/${accountId}/sessions/new`}>
              <PlusIcon />
              {t("tools.recruitment.newSession")}
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col">
      <div
        className={`grid gap-x-4 border-b px-3 pb-2 text-xs text-muted-foreground max-md:hidden ${COLUMNS}`}
      >
        <span>{t("tools.recruitment.session")}</span>
        <span>{t("tools.recruitment.pickups")}</span>
        <span className="text-right">{t("tools.recruitment.paidPulls")}</span>
        <span className="text-right">{t("tools.recruitment.threeStars")}</span>
        <span className="text-right">
          {t("tools.recruitment.chargeBeforeAfter")}
        </span>
        <span />
      </div>
      {result.sessions.map((session) => {
        const { stats } = session;
        const permanentEnd =
          stats.permanentEndCharge ??
          stats.pools?.permanent.endCharge ??
          stats.endCharge;
        const limitedEnd =
          stats.limitedEndCharge ??
          stats.pools?.limited.endCharge ??
          stats.endCharge;
        const permanentStart =
          session.permanentStartCharge ??
          (session.kind === "limited" ? 0 : session.startCharge);
        const limitedStart =
          session.limitedStartCharge ??
          (session.kind === "limited" ? session.startCharge : 0);
        const charges = (
          <span className="inline-flex flex-col items-end gap-0.5 tabular-nums">
            {session.kind !== "limited" && (
              <ChargeChange
                kind="permanent"
                before={permanentStart}
                after={permanentEnd}
              />
            )}
            {session.kind !== "permanent" && (
              <ChargeChange
                kind="limited"
                before={limitedStart}
                after={limitedEnd}
              />
            )}
          </span>
        );

        return (
          <Link
            href={`/user/recruitment/${accountId}/sessions/${session._id}`}
            key={session._id}
            className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b px-3 py-3 transition-colors hover:bg-accent ${COLUMNS}`}
          >
            <div className="min-w-0">
              <div className="truncate font-semibold">{session.name}</div>
              <div className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                <span>
                  {format.dateTime(new Date(session.date), {
                    dateStyle: "medium",
                  })}
                </span>
                <SessionKindLabel
                  kind={session.kind}
                  isFestBanner={session.isFestBanner}
                />
              </div>
            </div>
            <div className="flex -space-x-2 max-md:justify-end">
              {session.pickupsObtained.map((pickup, index) => (
                <img
                  key={`${pickup.studentId}-${index}`}
                  src={buildStudentIconUrlFromId(pickup.studentId)}
                  alt=""
                  className="size-9 rounded-full border-2 border-background bg-muted object-cover"
                />
              ))}
            </div>
            <Figure
              className="max-md:hidden"
              value={stats.paidPulls}
              detail={t("tools.recruitment.totalCount", {
                count: session.totalPulls,
              })}
            />
            <Figure
              className="max-md:hidden"
              value={session.threeStarCount}
              detail={`${stats.experiencedThreeStarRate.toFixed(2)}%`}
            />
            <div className="text-right max-md:hidden">{charges}</div>
            <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm md:hidden">
              <span className="inline-flex items-center gap-2">
                <span className="text-muted-foreground">
                  {t("tools.recruitment.paidPulls")}
                </span>
                {stats.paidPulls}
              </span>
              <span>
                {session.threeStarCount} {t("tools.recruitment.threeStars")}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="text-muted-foreground">
                  {t("tools.recruitment.chargeBeforeAfter")}
                </span>
                {charges}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 text-sm max-md:col-span-2 md:flex-col md:items-end">
              {stats.softPityWins > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  {t("tools.recruitment.softPityWins", {
                    count: stats.softPityWins,
                  })}
                </span>
              )}
              {stats.softPityLosses > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {t("tools.recruitment.softPityLosses", {
                    count: stats.softPityLosses,
                  })}
                </span>
              )}
              {stats.hardPities > 0 && (
                <span className="text-rose-600 dark:text-rose-400">
                  {t("tools.recruitment.hardPities", {
                    count: stats.hardPities,
                  })}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function ChargeChange({
  kind,
  before,
  after,
}: {
  kind: RecruitmentKind;
  before: number;
  after: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <PoolMark kind={kind} />
      <span className="text-muted-foreground">{before}</span>
      <ArrowRightIcon className="size-3 text-muted-foreground" />
      <span className="font-medium">{after}</span>
    </span>
  );
}

function Figure({
  value,
  detail,
  className,
}: {
  value: number;
  detail: string;
  className?: string;
}) {
  return (
    <div className={`text-right tabular-nums ${className ?? ""}`}>
      <div className="font-medium">{value}</div>
      <div className="text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}
