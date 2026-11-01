import "server-only";

import { userQuery } from "@/lib/public-api/convex.server";
import { notFound } from "@/lib/public-api/route";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export async function getFormationPreset(
  userId: string,
  seasonId: string,
  presetId: string,
) {
  const presets = await userQuery(userId, api.pvp.listFormationPresets, {
    seasonId: seasonId as Id<"pvpSeason">,
  });

  const preset = presets.find((item) => item._id === presetId);
  if (!preset) {
    throw notFound("Preset not found.");
  }

  return preset;
}

export async function getEnemyPreset(
  userId: string,
  seasonId: string,
  presetId: string,
) {
  return await userQuery(userId, api.pvp.getEnemyPreset, {
    seasonId: seasonId as Id<"pvpSeason">,
    presetId: presetId as Id<"pvpEnemyPreset">,
  });
}
