"use client";

import { PVPEnemyPresetForm } from "@/app/pvp/_components/pvp-enemy-preset-form";
import { MessageBox } from "@/components/common/message-box";
import { useQuery } from "convex/react";
import { use } from "react";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export default function EditEnemyPresetPage({
  params,
}: {
  params: Promise<{ seasonId: string; presetId: string }>;
}) {
  const resolvedParams = use(params);
  const seasonId = resolvedParams.seasonId as Id<"pvpSeason">;

  const presets = useQuery(api.pvp.listEnemyPresets, { seasonId });
  const preset = presets?.find((item) => item._id === resolvedParams.presetId);

  if (presets === undefined) {
    return <MessageBox>Loading enemy preset...</MessageBox>;
  }

  if (!preset) {
    return <MessageBox>Enemy preset not found.</MessageBox>;
  }

  return <PVPEnemyPresetForm seasonId={seasonId} preset={preset} />;
}
