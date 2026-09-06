import { PVPFormationPresetsPage } from "@/app/pvp/_components/pvp-formation-presets-page";
import type { Id } from "~convex/dataModel";

export default async function FormationPresetsPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  return <PVPFormationPresetsPage seasonId={seasonId as Id<"pvpSeason">} />;
}
