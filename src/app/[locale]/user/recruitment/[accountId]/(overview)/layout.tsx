import type { ReactNode } from "react";
import { RecruitmentAccountShell } from "@/app/[locale]/user/recruitment/_components/account-shell";
import type { Id } from "~convex/dataModel";

export default async function RecruitmentAccountOverviewLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{
    accountId: string;
  }>;
}) {
  const { accountId } = await params;
  return (
    <RecruitmentAccountShell accountId={accountId as Id<"recruitmentAccount">}>
      {children}
    </RecruitmentAccountShell>
  );
}
