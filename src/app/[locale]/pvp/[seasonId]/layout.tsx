import { PVPSeasonProvider } from "@/app/[locale]/pvp/_components/pvp-season-provider";
import { SignedOutRedirect } from "@/components/auth/signed-out-redirect";
import { auth } from "@clerk/nextjs/server";
import type { PropsWithChildren } from "react";
import type { Id } from "~convex/dataModel";

export default async function PVPSeasonLayout({
  children,
  params,
}: PropsWithChildren<{ params: Promise<{ seasonId: string }> }>) {
  await auth.protect();

  const { seasonId } = await params;
  return (
    <SignedOutRedirect>
      <PVPSeasonProvider key={seasonId} seasonId={seasonId as Id<"pvpSeason">}>
        {children}
      </PVPSeasonProvider>
    </SignedOutRedirect>
  );
}
