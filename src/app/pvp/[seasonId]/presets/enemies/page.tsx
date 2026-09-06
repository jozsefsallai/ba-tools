import { PVPEnemyPresetsPage } from "@/app/pvp/_components/pvp-enemy-presets-page";
import type { Id } from "~convex/dataModel";

export default async function EnemyPresetsPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  return <PVPEnemyPresetsPage seasonId={seasonId as Id<"pvpSeason">} />;
}
