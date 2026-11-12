import { RecruitmentSessionEditor } from "@/app/[locale]/recruitment-tracker/recruitment-session-editor";
import type { Id } from "~convex/dataModel";

export default async function RecruitmentSessionPage({
  params,
}: {
  params: Promise<{
    accountId: string;
    sessionId: string;
  }>;
}) {
  const { accountId, sessionId } = await params;
  return (
    <RecruitmentSessionEditor
      accountId={accountId as Id<"recruitmentAccount">}
      sessionId={sessionId as Id<"recruitmentSession">}
    />
  );
}
