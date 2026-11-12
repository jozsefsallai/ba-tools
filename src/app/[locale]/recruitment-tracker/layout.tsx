import { getLocale } from "next-intl/server";
import type { PropsWithChildren } from "react";
import { RecruitmentSignedOut } from "@/app/[locale]/recruitment-tracker/_components/signed-out";
import { SignedInOnly } from "@/components/auth/signed-out-tool-view";
import { getCardMetadata } from "@/lib/og-metadata.server";

export async function generateMetadata() {
  return getCardMetadata("user-recruitment", await getLocale());
}

export default function RecruitmentLayout({ children }: PropsWithChildren) {
  return (
    <SignedInOnly signedOut={<RecruitmentSignedOut />}>
      <div className="mx-auto w-full min-w-0 max-w-[1400px]">{children}</div>
    </SignedInOnly>
  );
}
