import { PVPEnemyPresetsPage } from "@/app/[locale]/pvp/_components/pvp-enemy-presets-page";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { auth } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata() {
  return getCardMetadata("pvp-seasonId-presets-opponents", await getLocale());
}

export default async function OpponentPresetsPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  await auth.protect();
  const { seasonId } = await params;
  return <PVPEnemyPresetsPage seasonId={seasonId as Id<"pvpSeason">} />;
}
