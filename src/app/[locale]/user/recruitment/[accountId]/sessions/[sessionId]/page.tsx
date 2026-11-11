import { auth } from "@clerk/nextjs/server";
import { RecruitmentSessionEditor } from "@/app/[locale]/user/recruitment/recruitment-session-editor";
import type { Id } from "~convex/dataModel";

export default async function RecruitmentSessionPage({
  params,
}: {
  params: Promise<{
    accountId: string;
    sessionId: string;
  }>;
}) {
  await auth.protect();
  const { accountId, sessionId } = await params;
  return (
    <RecruitmentSessionEditor
      accountId={accountId as Id<"recruitmentAccount">}
      sessionId={sessionId as Id<"recruitmentSession">}
    />
  );
}
