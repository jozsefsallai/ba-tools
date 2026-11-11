import { auth } from "@clerk/nextjs/server";
import { RecruitmentAccountView } from "@/app/[locale]/user/recruitment/recruitment-account-view";
import type { Id } from "~convex/dataModel";

export default async function RecruitmentAccountPage({
  params,
}: {
  params: Promise<{
    accountId: string;
  }>;
}) {
  await auth.protect();
  const { accountId } = await params;
  return (
    <RecruitmentAccountView accountId={accountId as Id<"recruitmentAccount">} />
  );
}
