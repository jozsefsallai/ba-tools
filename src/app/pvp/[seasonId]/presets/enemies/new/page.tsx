import { PVPEnemyPresetForm } from "@/app/pvp/_components/pvp-enemy-preset-form";
import type { Id } from "~convex/dataModel";

export default async function NewEnemyPresetPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  return <PVPEnemyPresetForm seasonId={seasonId as Id<"pvpSeason">} />;
}
