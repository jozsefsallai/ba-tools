"use client";

import { useQuery } from "convex/react";
import { PlusIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { AccountDialog } from "@/app/[locale]/recruitment-tracker/_components/account-dialog";
import {
  ChargeGauge,
  EmptyState,
} from "@/app/[locale]/recruitment-tracker/_components/shared";
import type { Account } from "@/app/[locale]/recruitment-tracker/_components/types";
import { MessageBox } from "@/components/common/message-box";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { GAME_SERVER_NAMES } from "@/lib/types";
import { api } from "~convex/api";

export function RecruitmentAccounts() {
  const locale = useLocale();
  const t = useTranslations();
  const accounts = useQuery(api.recruitment.getOwnAccounts, {});
  const [dialogOpen, setDialogOpen] = useState(false);

  const newAccountButton = (
    <Button onClick={() => setDialogOpen(true)}>
      <PlusIcon />
      {t("tools.recruitment.newAccount")}
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 max-sm:flex-col">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold">{t("tools.recruitment.title")}</h1>

          <p className="text-muted-foreground">
            {t("tools.recruitment.description")}
          </p>
        </div>

        {accounts && accounts.length > 0 && newAccountButton}
      </div>

      {locale !== "ja" && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          {t.rich("tools.recruitment.systemNotice", {
            strong: (children) => <strong>{children}</strong>,
          })}
        </div>
      )}

      {accounts === undefined ? (
        <MessageBox>{t("common.loading")}</MessageBox>
      ) : accounts.length === 0 ? (
        <EmptyState
          title={t("tools.recruitment.noAccounts")}
          description={t("tools.recruitment.noAccountsHint")}
          action={newAccountButton}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map((account) => (
            <AccountCard key={account._id} account={account} />
          ))}
        </div>
      )}

      <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

type AccountCardProps = {
  account: Account;
};

function AccountCard({ account }: AccountCardProps) {
  const t = useTranslations();

  const pullCount = Object.values(account.aggregates ?? {}).reduce(
    (sum, bucket) => sum + bucket.totalPulls,
    0,
  );

  return (
    <Link
      href={`/recruitment-tracker/${account._id}`}
      className="flex flex-col gap-5 rounded-md border p-4 transition-colors hover:bg-accent"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="truncate text-lg font-semibold">{account.name}</h2>

        <span className="shrink-0 text-sm text-muted-foreground">
          {GAME_SERVER_NAMES[account.gameServer]}
        </span>
      </div>

      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <ChargeGauge compact kind="permanent" value={account.permanentCharge} />
        <ChargeGauge compact kind="limited" value={account.limitedCharge} />
      </div>

      {account.aggregates && (
        <div className="text-sm text-muted-foreground">
          {t("tools.recruitment.pullCount", {
            count: pullCount,
          })}
        </div>
      )}
    </Link>
  );
}
