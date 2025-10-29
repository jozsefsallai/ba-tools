import { PVPMatchEditView } from "@/app/pvp/_components/pvp-match-edit-view";
import type { Metadata } from "next";
import type { Id } from "~convex/dataModel";

export const metadata: Metadata = {
  title: "Edit PVP Match - Joe's Blue Archive Tools",
  description: "Edit PVP match.",
  twitter: {
    card: "summary",
  },
};

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
