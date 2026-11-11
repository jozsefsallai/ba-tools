"use client";

import { useQuery } from "convex/react";
import { ChevronLeftIcon, PlusIcon, SettingsIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { AccountDialog } from "@/app/[locale]/user/recruitment/_components/account-dialog";
import {
  ChargeGauge,
  formatRate,
  Readout,
} from "@/app/[locale]/user/recruitment/_components/shared";
import type { SessionWithStats } from "@/app/[locale]/user/recruitment/_components/types";
import { MessageBox } from "@/components/common/message-box";
import { Button } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { GAME_SERVER_NAMES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

function sumSessions(sessions: SessionWithStats[]) {
  const totals = {
    pulls: 0,
    paidPulls: 0,
    threeStars: 0,
    pickups: 0,
  };

  for (const session of sessions) {
    totals.pulls += session.totalPulls;
    totals.paidPulls += session.stats.paidPulls;
    totals.threeStars += session.threeStarCount;
    totals.pickups += session.stats.pickupCount;
  }

  return totals;
}

type RecruitmentAccountShellProps = {
  accountId: Id<"recruitmentAccount">;
  children: ReactNode;
};

export function RecruitmentAccountShell({
  accountId,
  children,
}: RecruitmentAccountShellProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const [editOpen, setEditOpen] = useState(false);

  const result = useQuery(api.recruitment.getAccount, {
    accountId,
  });

  if (result === undefined) {
    return <MessageBox>{t("common.loading")}</MessageBox>;
  }

  if (!result) {
    return <MessageBox>{t("tools.recruitment.failedToLoad")}</MessageBox>;
  }

  const { account, sessions } = result;
  const [latestSession] = sessions;
  const totals = sumSessions(sessions);

  const basePath = `/user/recruitment/${accountId}`;
  const onAnalytics = pathname.endsWith("/analytics");

  const tabs = [
    {
      href: basePath,
      label: t("tools.recruitment.sessions"),
      active: !onAnalytics,
    },
    {
      href: `${basePath}/analytics`,
      label: t("tools.recruitment.analytics"),
      active: onAnalytics,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 self-start text-muted-foreground"
        >
          <Link href="/user/recruitment">
            <ChevronLeftIcon />
            {t("common.backTo", {
              destination: t("tools.recruitment.title"),
            })}
          </Link>
        </Button>

        <div className="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="truncate text-xl font-bold">{account.name}</h1>

            <span className="shrink-0 text-sm text-muted-foreground">
              {GAME_SERVER_NAMES[account.gameServer]}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="max-sm:flex-1"
              onClick={() => setEditOpen(true)}
            >
              <SettingsIcon />
              {t("tools.recruitment.editAccount")}
            </Button>

            <Button asChild className="max-sm:flex-1">
              <Link href={`${basePath}/sessions/new`}>
                <PlusIcon />
                {t("tools.recruitment.newSession")}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,2fr)_minmax(14rem,0.8fr)]">
        <div className="flex flex-col gap-3">
          <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
            <ChargeGauge kind="permanent" value={account.permanentCharge} />
            <ChargeGauge kind="limited" value={account.limitedCharge} />
          </div>

          <div className="flex items-baseline gap-2 text-sm">
            <span className="text-muted-foreground">
              {t("tools.recruitment.availableRebateTickets")}
            </span>

            <span className="font-nexon-football-gothic text-lg leading-none">
              {latestSession?.stats.remainingRebateTickets ?? 0}
            </span>
          </div>
        </div>

        <Readout
          className="border-t"
          items={[
            {
              label: t("tools.recruitment.totalPulls"),
              value: totals.pulls.toLocaleString(),
              detail: t("tools.recruitment.paidCount", {
                count: totals.paidPulls,
              }),
            },
            {
              label: t("tools.recruitment.threeStars"),
              value: totals.threeStars,
              detail: formatRate(totals.threeStars, totals.pulls),
            },
            {
              label: t("tools.recruitment.pickups"),
              value: totals.pickups,
              detail: formatRate(totals.pickups, totals.pulls),
            },
            {
              label: t("tools.recruitment.averagePullsPerPU"),
              value:
                totals.pickups === 0
                  ? "—"
                  : (totals.pulls / totals.pickups).toFixed(2),
            },
          ]}
        />
      </div>

      <nav className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab.active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}

      <AccountDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        account={account}
      />
    </div>
  );
}
