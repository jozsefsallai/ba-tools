import { RecruitmentAccounts } from "@/app/[locale]/user/recruitment/recruitment-accounts";
import { auth } from "@clerk/nextjs/server";

export default async function RecruitmentPage() {
  await auth.protect();
  return <RecruitmentAccounts />;
}
