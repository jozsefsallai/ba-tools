import { PVPStatsSearch } from "@/app/[locale]/pvp/_components/pvp-stats-search";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("tools.pvp.stats.title")} - ${t("common.appName")}`,
    description: t("tools.pvp.stats.description"),
  };
}

export default function PVPStatsSearchPage() {
  return <PVPStatsSearch />;
}
