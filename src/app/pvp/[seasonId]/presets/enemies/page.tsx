import { PVPEnemyPresetsPage } from "@/app/pvp/_components/pvp-enemy-presets-page";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("tools.pvp.presets.enemyTitle")} - ${t("common.appName")}`,
    description: t("tools.pvp.presets.enemyDescription"),
  };
}

export default async function EnemyPresetsPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  return <PVPEnemyPresetsPage seasonId={seasonId as Id<"pvpSeason">} />;
}
