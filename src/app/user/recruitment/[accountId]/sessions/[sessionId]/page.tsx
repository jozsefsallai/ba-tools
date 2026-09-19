import { RecruitmentSessionEditor } from "@/app/user/recruitment/recruitment-session-editor";
import { auth } from "@clerk/nextjs/server";

export default async function RecruitmentSessionPage({
  params,
}: {
  params: Promise<{ accountId: string; sessionId: string }>;
}) {
  await auth.protect();
  const { accountId, sessionId } = await params;
  return (
    <RecruitmentSessionEditor accountId={accountId} sessionId={sessionId} />
  );
}
