import { PVPMatchEditView } from "@/app/[locale]/pvp/_components/pvp-match-edit-view";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { auth } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata() {
  return getCardMetadata("pvp-seasonId-match-matchId", await getLocale());
}

export default async function PVPMatchPage({
  params,
}: {
  params: Promise<{
    seasonId: Id<"pvpSeason">;
    matchId: Id<"pvpMatchRecord">;
  }>;
}) {
  await auth.protect();
  const { seasonId, matchId } = await params;
  return <PVPMatchEditView seasonId={seasonId} matchId={matchId} />;
}
