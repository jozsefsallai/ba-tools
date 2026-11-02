import "server-only";

import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { mergeForUpdate, notFound } from "@/lib/public-api/route";
import { toPage, toResource } from "@/lib/public-api/serialize";
import type { PaginationOptions } from "convex/server";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

const SEASON_UPDATE_KEYS = ["name", "gameServer", "seasonNumber"] as const;

async function findSeason(userId: string, seasonId: string) {
  return await userQuery(userId, api.pvp.getSeason, {
    seasonId: seasonId as Id<"pvpSeason">,
  });
}

async function findMatch(userId: string, seasonId: string, matchId: string) {
  return await userQuery(userId, api.pvp.getMatchById, {
    seasonId: seasonId as Id<"pvpSeason">,
    matchId: matchId as Id<"pvpMatchRecord">,
  });
}

async function findFormationPreset(
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

async function findEnemyPreset(
  userId: string,
  seasonId: string,
  presetId: string,
) {
  return await userQuery(userId, api.pvp.getEnemyPreset, {
    seasonId: seasonId as Id<"pvpSeason">,
    presetId: presetId as Id<"pvpEnemyPreset">,
  });
}

async function findEnemyTeam(userId: string, seasonId: string, teamId: string) {
  return await userQuery(userId, api.pvp.getEnemyTeam, {
    seasonId: seasonId as Id<"pvpSeason">,
    teamId: teamId as Id<"pvpEnemyTeam">,
  });
}

// Seasons

export async function listPvpSeasons(userId: string) {
  return toResource(await userQuery(userId, api.pvp.getOwnSeasons, {}));
}

export async function getPvpSeason(userId: string, seasonId: string) {
  return toResource(await findSeason(userId, seasonId));
}

export async function createPvpSeason(
  userId: string,
  input: Record<string, unknown>,
) {
  const seasonId = await userMutation(
    userId,
    api.pvp.createSeason,
    input as UserArgs<typeof api.pvp.createSeason>,
  );

  return await getPvpSeason(userId, seasonId);
}

export async function updatePvpSeason(
  userId: string,
  seasonId: string,
  { archived, ...patch }: Record<string, unknown>,
) {
  const current = await findSeason(userId, seasonId);

  if (Object.keys(patch).length > 0) {
    await userMutation(userId, api.pvp.updateSeason, {
      ...mergeForUpdate(current, SEASON_UPDATE_KEYS, patch),
      seasonId: current._id,
    } as UserArgs<typeof api.pvp.updateSeason>);
  }

  if (archived !== undefined) {
    await userMutation(userId, api.pvp.setSeasonArchived, {
      seasonId: current._id,
      archived: archived as boolean,
    });
  }

  return await getPvpSeason(userId, current._id);
}

export async function deletePvpSeason(userId: string, seasonId: string) {
  await userMutation(userId, api.pvp.deleteSeason, {
    seasonId: seasonId as Id<"pvpSeason">,
  });
}

// Matches

export async function listPvpMatches(
  userId: string,
  seasonId: string,
  { from, to }: { from?: number; to?: number },
) {
  const id = seasonId as Id<"pvpSeason">;

  const { matches } =
    from !== undefined || to !== undefined
      ? await userQuery(userId, api.pvp.getMatchesForSeasonRange, {
          seasonId: id,
          startDate: from ?? 0,
          endDate: to ?? Number.MAX_SAFE_INTEGER,
        })
      : await userQuery(userId, api.pvp.getMatchesForSeason, { seasonId: id });

  return toResource(matches);
}

export async function getPvpMatch(
  userId: string,
  seasonId: string,
  matchId: string,
) {
  return toResource(await findMatch(userId, seasonId, matchId));
}

export async function createPvpMatch(
  userId: string,
  seasonId: string,
  input: Record<string, unknown>,
) {
  const matchId = await userMutation(userId, api.pvp.recordMatch, {
    ...input,
    seasonId: seasonId as Id<"pvpSeason">,
  } as UserArgs<typeof api.pvp.recordMatch>);

  return await getPvpMatch(userId, seasonId, matchId);
}

export async function updatePvpMatch(
  userId: string,
  seasonId: string,
  matchId: string,
  patch: Record<string, unknown>,
) {
  const current = await findMatch(userId, seasonId, matchId);

  return toResource(
    await userMutation(userId, api.pvp.updateMatch, {
      ...patch,
      matchId: current._id,
    } as UserArgs<typeof api.pvp.updateMatch>),
  );
}

export async function deletePvpMatch(
  userId: string,
  seasonId: string,
  matchId: string,
) {
  const match = await findMatch(userId, seasonId, matchId);
  await userMutation(userId, api.pvp.deleteMatch, { matchId: match._id });
}

// Formation presets

export async function listPvpFormationPresets(
  userId: string,
  seasonId: string,
  { search }: { search?: string },
) {
  return toResource(
    await userQuery(userId, api.pvp.listFormationPresets, {
      seasonId: seasonId as Id<"pvpSeason">,
      search,
    }),
  );
}

export async function getPvpFormationPreset(
  userId: string,
  seasonId: string,
  presetId: string,
) {
  return toResource(await findFormationPreset(userId, seasonId, presetId));
}

export async function createPvpFormationPreset(
  userId: string,
  seasonId: string,
  input: Record<string, unknown>,
) {
  const presetId = await userMutation(userId, api.pvp.createFormationPreset, {
    ...input,
    seasonId: seasonId as Id<"pvpSeason">,
  } as UserArgs<typeof api.pvp.createFormationPreset>);

  return await getPvpFormationPreset(userId, seasonId, presetId);
}

export async function updatePvpFormationPreset(
  userId: string,
  seasonId: string,
  presetId: string,
  patch: Record<string, unknown>,
) {
  const current = await findFormationPreset(userId, seasonId, presetId);

  await userMutation(userId, api.pvp.updateFormationPreset, {
    ...patch,
    presetId: current._id,
  } as UserArgs<typeof api.pvp.updateFormationPreset>);

  return await getPvpFormationPreset(userId, seasonId, presetId);
}

export async function deletePvpFormationPreset(
  userId: string,
  seasonId: string,
  presetId: string,
) {
  const preset = await findFormationPreset(userId, seasonId, presetId);

  await userMutation(userId, api.pvp.deleteFormationPreset, {
    presetId: preset._id,
  });
}

// Enemy presets

export async function listPvpEnemyPresets(
  userId: string,
  seasonId: string,
  { search }: { search?: string },
  paginationOpts: PaginationOptions,
) {
  return toPage(
    await userQuery(userId, api.pvp.listEnemyPresets, {
      seasonId: seasonId as Id<"pvpSeason">,
      search,
      paginationOpts,
    }),
  );
}

export async function getPvpEnemyPreset(
  userId: string,
  seasonId: string,
  presetId: string,
) {
  return toResource(await findEnemyPreset(userId, seasonId, presetId));
}

export async function listPvpEnemyPresetTeams(
  userId: string,
  seasonId: string,
  presetId: string,
) {
  const { teams } = await userQuery(userId, api.pvp.getEnemyPresetTeams, {
    seasonId: seasonId as Id<"pvpSeason">,
    presetId: presetId as Id<"pvpEnemyPreset">,
  });

  return toResource(teams);
}

export async function createPvpEnemyPreset(
  userId: string,
  seasonId: string,
  input: Record<string, unknown>,
) {
  const presetId = await userMutation(userId, api.pvp.createEnemyPreset, {
    ...input,
    seasonId: seasonId as Id<"pvpSeason">,
  } as UserArgs<typeof api.pvp.createEnemyPreset>);

  return await getPvpEnemyPreset(userId, seasonId, presetId);
}

export async function updatePvpEnemyPreset(
  userId: string,
  seasonId: string,
  presetId: string,
  patch: Record<string, unknown>,
) {
  const current = await findEnemyPreset(userId, seasonId, presetId);

  await userMutation(userId, api.pvp.updateEnemyPreset, {
    ...patch,
    presetId: current._id,
  } as UserArgs<typeof api.pvp.updateEnemyPreset>);

  return await getPvpEnemyPreset(userId, seasonId, presetId);
}

export async function deletePvpEnemyPreset(
  userId: string,
  seasonId: string,
  presetId: string,
) {
  const preset = await findEnemyPreset(userId, seasonId, presetId);

  await userMutation(userId, api.pvp.deleteEnemyPreset, {
    presetId: preset._id,
  });
}

// Enemy teams

export async function getPvpEnemyTeam(
  userId: string,
  seasonId: string,
  teamId: string,
) {
  return toResource(await findEnemyTeam(userId, seasonId, teamId));
}

export async function createPvpEnemyTeam(
  userId: string,
  seasonId: string,
  input: Record<string, unknown>,
) {
  const teamId = await userMutation(userId, api.pvp.createEnemyTeam, {
    ...input,
    seasonId: seasonId as Id<"pvpSeason">,
  } as UserArgs<typeof api.pvp.createEnemyTeam>);

  return await getPvpEnemyTeam(userId, seasonId, teamId);
}

export async function updatePvpEnemyTeam(
  userId: string,
  seasonId: string,
  teamId: string,
  patch: Record<string, unknown>,
) {
  const current = await findEnemyTeam(userId, seasonId, teamId);

  const updatedId = await userMutation(userId, api.pvp.updateEnemyTeam, {
    ...patch,
    teamId: current._id,
  } as UserArgs<typeof api.pvp.updateEnemyTeam>);

  return await getPvpEnemyTeam(userId, seasonId, updatedId);
}

export async function deletePvpEnemyTeam(
  userId: string,
  seasonId: string,
  teamId: string,
) {
  const team = await findEnemyTeam(userId, seasonId, teamId);
  await userMutation(userId, api.pvp.deleteEnemyTeam, { teamId: team._id });
}
