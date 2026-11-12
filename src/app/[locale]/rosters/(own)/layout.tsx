import { getLocale } from "next-intl/server";
import type { PropsWithChildren } from "react";
import { RostersSignedOut } from "@/app/[locale]/rosters/(own)/_components/signed-out";
import { SignedInOnly } from "@/components/auth/signed-out-tool-view";
import { getCardMetadata } from "@/lib/og-metadata.server";

export async function generateMetadata() {
  return getCardMetadata("user-rosters", await getLocale());
}

export default function MyRostersLayout({ children }: PropsWithChildren) {
  return (
    <SignedInOnly signedOut={<RostersSignedOut />}>{children}</SignedInOnly>
  );
}
