import { PVPEnemyPresetTeamsPage } from "@/app/pvp/_components/pvp-enemy-preset-teams-page";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("tools.pvp.presets.teamsTitle")} - ${t("common.appName")}`,
    description: t("tools.pvp.presets.enemyDescription"),
  };
}

export default async function EnemyPresetTeamsRoute({
  params,
}: {
  params: Promise<{ seasonId: string; presetId: string }>;
}) {
  const resolved = await params;
  return (
    <PVPEnemyPresetTeamsPage
      seasonId={resolved.seasonId as Id<"pvpSeason">}
      presetId={resolved.presetId as Id<"pvpEnemyPreset">}
    />
  );
}
