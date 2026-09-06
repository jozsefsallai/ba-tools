import { PVPMatchEditView } from "@/app/pvp/_components/pvp-match-edit-view";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("tools.pvp.match.editMatch")} - ${t("common.appName")}`,
    description: t("tools.pvp.description"),
  };
}

export default async function PVPMatchPage({
  params,
}: {
  params: Promise<{
    seasonId: Id<"pvpSeason">;
    matchId: Id<"pvpMatchRecord">;
  }>;
}) {
  const { seasonId, matchId } = await params;
  return <PVPMatchEditView seasonId={seasonId} matchId={matchId} />;
}
