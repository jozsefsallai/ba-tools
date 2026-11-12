import { RecruitmentAnalyticsPage } from "@/app/[locale]/recruitment-tracker/recruitment-analytics-page";
import type { Id } from "~convex/dataModel";

export default async function RecruitmentAnalyticsRoute({
  params,
}: {
  params: Promise<{
    accountId: string;
  }>;
}) {
  const { accountId } = await params;
  return (
    <RecruitmentAnalyticsPage
      accountId={accountId as Id<"recruitmentAccount">}
    />
  );
}
