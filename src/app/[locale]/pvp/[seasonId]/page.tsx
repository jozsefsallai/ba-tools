import { PVPSeasonView } from "@/app/[locale]/pvp/_components/pvp-season-view";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { auth } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata() {
  return getCardMetadata("pvp-seasonId", await getLocale());
}

export default async function PVPSeasonPage({
  params,
}: {
  params: Promise<{
    seasonId: Id<"pvpSeason">;
  }>;
}) {
  await auth.protect();
  const { seasonId } = await params;
  return <PVPSeasonView seasonId={seasonId} />;
}
