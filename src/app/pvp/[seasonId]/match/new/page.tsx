import { PVPMatchEditor } from "@/app/pvp/_components/pvp-match-editor";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("tools.pvp.match.recordNewMatch")} - ${t("common.appName")}`,
    description: t("tools.pvp.description"),
  };
}

export default async function NewPVPMatchPage({
  params,
}: {
  params: Promise<{ seasonId: Id<"pvpSeason"> }>;
}) {
  const { seasonId } = await params;
  return <PVPMatchEditor seasonId={seasonId} />;
}
