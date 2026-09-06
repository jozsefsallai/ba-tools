"use client";

import { PVPFormationPresetForm } from "@/app/pvp/_components/pvp-formation-preset-form";
import { MessageBox } from "@/components/common/message-box";
import { useQuery } from "convex/react";
import { use } from "react";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export default function EditFormationPresetPage({
  params,
}: {
  params: Promise<{ seasonId: string; presetId: string }>;
}) {
  const resolvedParams = use(params);
  const seasonId = resolvedParams.seasonId as Id<"pvpSeason">;

  const presets = useQuery(api.pvp.listFormationPresets, { seasonId });
  const preset = presets?.find((item) => item._id === resolvedParams.presetId);
  if (presets === undefined) {
    return <MessageBox>Loading formation preset...</MessageBox>;
  }

  if (!preset) {
    return <MessageBox>Formation preset not found.</MessageBox>;
  }

  return <PVPFormationPresetForm seasonId={seasonId} preset={preset} />;
}
