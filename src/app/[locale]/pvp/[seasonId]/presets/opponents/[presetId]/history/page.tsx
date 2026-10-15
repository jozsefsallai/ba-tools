import { PVPEnemyPresetHistoryPage } from "@/app/[locale]/pvp/_components/pvp-enemy-preset-history-page";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { getLocale } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata() {
  return getCardMetadata(
    "pvp-seasonId-presets-opponents-presetId-history",
    await getLocale(),
  );
}

export default async function PVPEnemyPresetHistoryRoute({
  params,
}: { params: Promise<{ seasonId: string; presetId: string }> }) {
  const resolved = await params;
  return (
    <PVPEnemyPresetHistoryPage
      seasonId={resolved.seasonId as Id<"pvpSeason">}
      presetId={
        resolved.presetId === "anonymous"
          ? undefined
          : (resolved.presetId as Id<"pvpEnemyPreset">)
      }
    />
  );
}
