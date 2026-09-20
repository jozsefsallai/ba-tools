import { PVPFormationPresetsPage } from "@/app/[locale]/pvp/_components/pvp-formation-presets-page";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("tools.pvp.presets.formationTitle")} - ${t("common.appName")}`,
    description: t("tools.pvp.presets.formationDescription"),
  };
}

export default async function FormationPresetsPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  await auth.protect();
  const { seasonId } = await params;
  return <PVPFormationPresetsPage seasonId={seasonId as Id<"pvpSeason">} />;
}
