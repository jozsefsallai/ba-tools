import { PVPFormationPresetForm } from "@/app/pvp/_components/pvp-formation-preset-form";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("tools.pvp.presets.createFormation")} - ${t("common.appName")}`,
    description: t("tools.pvp.presets.formationDescription"),
  };
}

export default async function NewFormationPresetPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  return <PVPFormationPresetForm seasonId={seasonId as Id<"pvpSeason">} />;
}
