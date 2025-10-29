import { PVPSeasonView } from "@/app/pvp/_components/pvp-season-view";
import type { Metadata } from "next";
import type { Id } from "~convex/dataModel";

export const metadata: Metadata = {
  title: "PVP Matches - Joe's Blue Archive Tools",
  description: "View PVP matches.",
  twitter: {
    card: "summary",
  },
};

export default async function PVPSeasonPage({
  params,
}: {
  params: Promise<{
    seasonId: Id<"pvpSeason">;
  }>;
}) {
  const { seasonId } = await params;
  return <PVPSeasonView seasonId={seasonId} />;
}
