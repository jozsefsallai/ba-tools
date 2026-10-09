import { PVPEffectiveTeams } from "@/app/[locale]/pvp/_components/pvp-effective-teams";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();

  return {
    title: `${t("tools.pvp.rankings.title")} - ${t("common.appName")}`,
    description: t("tools.pvp.rankings.description"),
  };
}

export default function MostEffectiveTeamsPage() {
  return <PVPEffectiveTeams />;
}
