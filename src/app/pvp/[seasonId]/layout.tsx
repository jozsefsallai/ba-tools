import { SignedOutRedirect } from "@/components/auth/signed-out-redirect";
import { auth } from "@clerk/nextjs/server";
import type { PropsWithChildren } from "react";

export default async function PVPSeasonLayout({ children }: PropsWithChildren) {
  await auth.protect();

  return <SignedOutRedirect>{children}</SignedOutRedirect>;
}
