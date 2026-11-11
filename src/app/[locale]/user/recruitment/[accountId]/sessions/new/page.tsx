import { auth } from "@clerk/nextjs/server";
import { RecruitmentSessionEditor } from "@/app/[locale]/user/recruitment/recruitment-session-editor";
import type { Id } from "~convex/dataModel";

export default async function NewRecruitmentSessionPage({
  params,
}: {
  params: Promise<{
    accountId: string;
  }>;
}) {
  await auth.protect();
  const { accountId } = await params;
  return (
    <RecruitmentSessionEditor
      accountId={accountId as Id<"recruitmentAccount">}
    />
  );
}
