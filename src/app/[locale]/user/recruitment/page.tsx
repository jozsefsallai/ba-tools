import { auth } from "@clerk/nextjs/server";
import { RecruitmentAccounts } from "@/app/[locale]/user/recruitment/recruitment-accounts";

export default async function RecruitmentPage() {
  await auth.protect();
  return <RecruitmentAccounts />;
}
