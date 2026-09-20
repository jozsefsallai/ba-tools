import { PVPEnemyPresetForm } from "@/app/[locale]/pvp/_components/pvp-enemy-preset-form";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("tools.pvp.presets.createEnemy")} - ${t("common.appName")}`,
    description: t("tools.pvp.presets.enemyDescription"),
  };
}

export default async function NewOpponentPresetPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  await auth.protect();
  const { seasonId } = await params;
  return <PVPEnemyPresetForm seasonId={seasonId as Id<"pvpSeason">} />;
}
