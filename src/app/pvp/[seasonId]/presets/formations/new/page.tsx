import { PVPFormationPresetForm } from "@/app/pvp/_components/pvp-formation-preset-form";
import type { Id } from "~convex/dataModel";

export default async function NewFormationPresetPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  const { seasonId } = await params;
  return <PVPFormationPresetForm seasonId={seasonId as Id<"pvpSeason">} />;
}
