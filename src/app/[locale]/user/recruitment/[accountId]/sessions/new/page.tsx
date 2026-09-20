import { RecruitmentSessionEditor } from "@/app/[locale]/user/recruitment/recruitment-session-editor";
import { auth } from "@clerk/nextjs/server";

export default async function NewRecruitmentSessionPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  await auth.protect();
  const { accountId } = await params;
  return <RecruitmentSessionEditor accountId={accountId} />;
}
