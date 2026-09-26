import { PVPEnemyPresetHistoryPage } from "@/app/[locale]/pvp/_components/pvp-enemy-preset-history-page";
import { getTranslations } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: `${t("tools.pvp.presets.battleHistory")} - ${t("common.appName")}`,
  };
}

export default async function PVPEnemyPresetHistoryRoute({
  params,
}: { params: Promise<{ seasonId: string; presetId: string }> }) {
  const resolved = await params;
  return (
    <PVPEnemyPresetHistoryPage
      seasonId={resolved.seasonId as Id<"pvpSeason">}
      presetId={resolved.presetId as Id<"pvpEnemyPreset">}
    />
  );
}
