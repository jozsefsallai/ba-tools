import { RecruitmentAnalyticsPage } from "@/app/user/recruitment/recruitment-analytics-page";
import { auth } from "@clerk/nextjs/server";

export default async function RecruitmentAnalyticsRoute({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  await auth.protect();
  const { accountId } = await params;
  return <RecruitmentAnalyticsPage accountId={accountId} />;
}
