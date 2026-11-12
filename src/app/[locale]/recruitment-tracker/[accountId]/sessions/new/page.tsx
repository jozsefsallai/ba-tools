import { RecruitmentSessionEditor } from "@/app/[locale]/recruitment-tracker/recruitment-session-editor";
import type { Id } from "~convex/dataModel";

export default async function NewRecruitmentSessionPage({
  params,
}: {
  params: Promise<{
    accountId: string;
  }>;
}) {
  const { accountId } = await params;
  return (
    <RecruitmentSessionEditor
      accountId={accountId as Id<"recruitmentAccount">}
    />
  );
}
