import { auth } from "@clerk/nextjs/server";
import { RecruitmentAccountView } from "@/app/[locale]/user/recruitment/recruitment-account-view";

export default async function RecruitmentAccountPage({
  params,
}: {
  params: Promise<{
    accountId: string;
  }>;
}) {
  await auth.protect();
  const { accountId } = await params;
  return <RecruitmentAccountView accountId={accountId} />;
}
