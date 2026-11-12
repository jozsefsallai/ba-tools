import { RecruitmentAccountView } from "@/app/[locale]/recruitment-tracker/recruitment-account-view";
import type { Id } from "~convex/dataModel";

export default async function RecruitmentAccountPage({
  params,
}: {
  params: Promise<{
    accountId: string;
  }>;
}) {
  const { accountId } = await params;
  return (
    <RecruitmentAccountView accountId={accountId as Id<"recruitmentAccount">} />
  );
}
