"use client";

import { AccountAnalytics } from "@/app/[locale]/user/recruitment/_components/account-analytics";
import { MessageBox } from "@/components/common/message-box";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { ChevronLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";
import { Link } from "@/i18n/navigation";

export function RecruitmentAnalyticsPage({ accountId }: { accountId: string }) {
  const t = useTranslations();
  const result = useQuery(api.recruitment.getAccount, {
    accountId: accountId as Id<"recruitmentAccount">,
  });

  if (result === undefined) {
    return <MessageBox>{t("common.loading")}</MessageBox>;
  }
  if (!result) {
    return <MessageBox>{t("tools.recruitment.failedToLoad")}</MessageBox>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" asChild className="self-start">
        <Link href={`/user/recruitment/${accountId}`}>
          <ChevronLeftIcon />
          {t("common.backTo", {
            destination: t("tools.recruitment.account"),
          })}
        </Link>
      </Button>
      <div>
        <h1 className="text-xl font-bold">
          {t("tools.recruitment.accountAnalytics")}
        </h1>
        <p className="text-sm text-muted-foreground">
          <Link
            className="underline underline-offset-4"
            href={`/user/recruitment/${accountId}`}
          >
            {result.account.name}
          </Link>
        </p>
      </div>
      <AccountAnalytics
        aggregates={result.account.aggregates}
        sessions={result.sessions}
      />
    </div>
  );
}
