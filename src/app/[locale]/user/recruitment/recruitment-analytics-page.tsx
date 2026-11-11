"use client";

import { useQuery } from "convex/react";
import { AccountAnalytics } from "@/app/[locale]/user/recruitment/_components/account-analytics";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export function RecruitmentAnalyticsPage({ accountId }: { accountId: string }) {
  const result = useQuery(api.recruitment.getAccount, {
    accountId: accountId as Id<"recruitmentAccount">,
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
