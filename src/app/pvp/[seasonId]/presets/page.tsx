import { PVPPresetsView } from "@/app/pvp/_components/pvp-presets-view";
import type { Id } from "~convex/dataModel";

export default async function PVPPresetsPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  return <PVPPresetsView seasonId={seasonId as Id<"pvpSeason">} />;
}
