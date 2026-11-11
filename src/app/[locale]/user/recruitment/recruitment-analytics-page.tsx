"use client";

import { useQuery } from "convex/react";
import { AccountAnalytics } from "@/app/[locale]/user/recruitment/_components/account-analytics";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

type RecruitmentAnalyticsPageProps = {
  accountId: Id<"recruitmentAccount">;
};

export function RecruitmentAnalyticsPage({
  accountId,
}: RecruitmentAnalyticsPageProps) {
  const result = useQuery(api.recruitment.getAccount, {
    accountId,
  });

  if (!result) {
    return null;
  }

  return (
    <AccountAnalytics
      aggregates={result.account.aggregates}
      sessions={result.sessions}
    />
  );
}
