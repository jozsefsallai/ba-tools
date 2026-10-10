import { SignedOutRedirect } from "@/components/auth/signed-out-redirect";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { auth } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import type { PropsWithChildren } from "react";

export async function generateMetadata() {
  return getCardMetadata("user", await getLocale());
}

export default async function UserLayout({ children }: PropsWithChildren) {
  await auth.protect();

  return <SignedOutRedirect>{children}</SignedOutRedirect>;
}
