import { auth } from "@clerk/nextjs/server";
import { RecruitmentAnalyticsPage } from "@/app/[locale]/user/recruitment/recruitment-analytics-page";

export default async function RecruitmentAnalyticsRoute({
  params,
}: {
  params: Promise<{
    accountId: string;
  }>;
}) {
  await auth.protect();
  const { accountId } = await params;
  return <RecruitmentAnalyticsPage accountId={accountId} />;
}
