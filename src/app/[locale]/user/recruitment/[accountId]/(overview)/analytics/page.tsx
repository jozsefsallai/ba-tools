import { auth } from "@clerk/nextjs/server";
import { RecruitmentAnalyticsPage } from "@/app/[locale]/user/recruitment/recruitment-analytics-page";
import type { Id } from "~convex/dataModel";

export default async function RecruitmentAnalyticsRoute({
  params,
}: {
  params: Promise<{
    accountId: string;
  }>;
}) {
  await auth.protect();
  const { accountId } = await params;
  return (
    <RecruitmentAnalyticsPage
      accountId={accountId as Id<"recruitmentAccount">}
    />
  );
}
