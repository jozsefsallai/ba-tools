import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { stream } from "convex-helpers/server/stream";
import {
  PVP_SEASONS,
  type PVPFormationPresetType,
  type PVPMatchType,
  type StarLevel,
  type UELevel,
} from "@/lib/types";
import type { Doc, Id } from "~convex/dataModel";
import type { MutationCtx, QueryCtx } from "~convex/server";
import {
  authenticatedMutation,
  authenticatedQuery,
  staffMutation,
} from "./lib/auth";
import { invalid, notFound } from "./lib/errors";
import { getPvpTeamKey } from "./lib/teamKey";
import {
  pvpEnemyPresetCreateArgs,
  pvpEnemyPresetUpdateArgs,
  pvpEnemyTeamCreateArgs,
  pvpEnemyTeamUpdateArgs,
  pvpFormationPresetCreateArgs,
  pvpFormationPresetUpdateArgs,
  pvpMatchCreateArgs,
  pvpMatchUpdateArgs,
  pvpSeasonArgs,
} from "./lib/validators";
import {
  queueMatchRemoval,
  queueMatchStats,
  queueMatchStatsForSeason,
  queueSeasonRebuild,
  validatePvpTeam,
} from "./pvpStats";
import schema from "./schema";

const emptyTeam = () => [
  {},
  {},
  {},
  {},
  {},
  {},
];

async function findEnemyPresetByName(
  ctx: QueryCtx,
  seasonId: Id<"pvpSeason">,
  name: string,
  opponentStudentRepId?: string,
) {
  const presets = await ctx.db
    .query("pvpEnemyPreset")
    .withIndex("by_seasonId_opponentName", (q) =>
      q.eq("seasonId", seasonId).eq("opponentName", name.trim()),
    )
    .order("asc")
    .collect();

  return (
    presets.find(
      (preset) =>
        opponentStudentRepId === undefined ||
        preset.opponentStudentRepId === opponentStudentRepId,
    ) ?? null
  );
}

const ENEMY_REP_SEARCH_MAX_STUDENTS = 10;
const ENEMY_REP_SEARCH_MAX_RESULTS = 30;

function enemyPresetMatchesName(
  preset: Pick<Doc<"pvpEnemyPreset">, "name" | "opponentName">,
  query: string,
) {
  return (
    preset.name.toLowerCase().includes(query) ||
    !!preset.opponentName?.toLowerCase().includes(query)
  );
}

async function updateEnemyPresetRecency(ctx: any, presetId: any) {
  const preset = await ctx.db.get(presetId);
  if (!preset) {
    return;
  }

  const matches = await ctx.db
    .query("pvpMatchRecord")
    .withIndex("by_enemyPresetId_date", (q: any) =>
      q.eq("enemyPresetId", presetId),
    )
    .collect();

  const lastRecordedAt = matches.reduce(
    (latest: number | undefined, match: any) =>
      latest === undefined || match._creationTime > latest
        ? match._creationTime
        : latest,
    undefined,
  );

  if (preset.lastRecordedAt !== lastRecordedAt) {
    await ctx.db.patch(presetId, {
      lastRecordedAt,
    });
  }
}

async function validateEnemyPresetForMatch(
  ctx: any,
  presetId: any,
  seasonId: any,
) {
  if (!presetId) {
    return;
  }

  const preset = await ctx.db.get(presetId);

  if (
    !preset ||
    preset.userId !== ctx.user._id ||
    preset.seasonId !== seasonId
  ) {
    throw notFound("Opponent preset not found");
  }
}

function withoutDamage(
  team: Array<{
    studentId?: string;
    level?: number;
    starLevel?: StarLevel;
    ueLevel?: UELevel;
    damage?: number;
  }>,
) {
  return team.map(({ damage: _damage, ...item }) => item);
}

const enemyTeamRole = (matchType: PVPMatchType): PVPMatchType => {
  return matchType === "attack" ? "defense" : "attack";
};

async function getOpponentMatches(
  ctx: QueryCtx,
  seasonId: Id<"pvpSeason">,
  presetId?: Id<"pvpEnemyPreset">,
) {
  const matches = await ctx.db
    .query("pvpMatchRecord")
    .withIndex("by_seasonId_enemyPresetId_date", (q) =>
      q.eq("seasonId", seasonId).eq("enemyPresetId", presetId),
    )
    .order("desc")
    .collect();

  return presetId
    ? matches
    : matches.filter((match) => !match.opponentName?.trim());
}

async function getManualEnemyTeams(
  ctx: QueryCtx,
  seasonId: Id<"pvpSeason">,
  presetId?: Id<"pvpEnemyPreset">,
) {
  return await ctx.db
    .query("pvpEnemyTeam")
    .withIndex("by_seasonId_enemyPresetId", (q) =>
      q.eq("seasonId", seasonId).eq("enemyPresetId", presetId),
    )
    .collect();
}

async function findManualEnemyTeam(
  ctx: QueryCtx,
  seasonId: Id<"pvpSeason">,
  presetId: Id<"pvpEnemyPreset"> | undefined,
  teamKey: string,
) {
  const teams = await getManualEnemyTeams(ctx, seasonId, presetId);

  return teams.find((team) => getPvpTeamKey(team.team) === teamKey);
}

function mergeEnemyRoles(
  current: Set<"attack" | "defense">,
  role: PVPFormationPresetType,
) {
  if (role === "both" || role === "attack") {
    current.add("attack");
  }

  if (role === "both" || role === "defense") {
    current.add("defense");
  }
}

function roleFromSet(roles: Set<"attack" | "defense">): PVPFormationPresetType {
  return roles.size === 2 ? "both" : roles.has("attack") ? "attack" : "defense";
}

async function getUniqueEnemyTeamsForPreset(
  ctx: QueryCtx,
  preset: {
    seasonId: Id<"pvpSeason">;
    _id?: Id<"pvpEnemyPreset">;
  },
) {
  const [matches, manualTeams] = await Promise.all([
    getOpponentMatches(ctx, preset.seasonId, preset._id),
    getManualEnemyTeams(ctx, preset.seasonId, preset._id),
  ]);

  const byKey = new Map<string, any>();

  const add = (
    team: any[],
    role: PVPFormationPresetType,
    updatedAt: number,
    manualTeamId?: any,
    countEncounter = false,
  ) => {
    if (!team.some((item) => item.studentId)) {
      return;
    }

    const normalized = withoutDamage(team);
    const key = getPvpTeamKey(normalized);
    const existing = byKey.get(key);

    if (!existing) {
      const roles = new Set<"attack" | "defense">();

      mergeEnemyRoles(roles, role);

      const encounterCounts = {
        attack: 0,
        defense: 0,
        total: 0,
      };

      if (countEncounter) {
        encounterCounts.total = 1;

        if (role === "attack") {
          encounterCounts.attack = 1;
        } else if (role === "defense") {
          encounterCounts.defense = 1;
        }
      }

      byKey.set(key, {
        team: normalized,
        teamKey: key,
        roles,
        updatedAt,
        manualTeamId,
        encounterCounts,
      });

      return;
    }

    mergeEnemyRoles(existing.roles, role);
    existing.manualTeamId = manualTeamId ?? existing.manualTeamId;

    if (countEncounter) {
      if (role === "attack") {
        existing.encounterCounts.attack += 1;
      } else if (role === "defense") {
        existing.encounterCounts.defense += 1;
      }
      existing.encounterCounts.total += 1;
    }

    if (updatedAt >= existing.updatedAt) {
      existing.team = normalized;
      existing.updatedAt = updatedAt;
    }
  };

  for (const match of matches) {
    add(
      match.opponentTeam,
      enemyTeamRole(match.matchType),
      match.date,
      undefined,
      true,
    );
  }

  for (const manual of manualTeams) {
    add(manual.team, manual.matchType, manual.updatedAt, manual._id);
  }

  return [
    ...byKey.values(),
  ]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((item) => ({
      ...item,
      roles: roleFromSet(item.roles),
    }));
}

async function getSeasonForUser(ctx: any, seasonId: any) {
  const season = await ctx.db.get(seasonId);

  if (!season || season.userId !== ctx.user._id) {
    throw notFound("Season not found");
  }

  return season;
}

function getSeasonSortOrder(season: {
  _creationTime: number;
  sortOrder?: number;
}) {
  return season.sortOrder ?? -season._creationTime;
}

export const getOwnSeasons = authenticatedQuery({
  args: {},
  handler: async (ctx) => {
    const seasons = await ctx.db
      .query("pvpSeason")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .collect();

    return seasons.sort((a, b) => {
      if (Boolean(a.archived) !== Boolean(b.archived)) {
        return a.archived ? 1 : -1;
      }

      return getSeasonSortOrder(a) - getSeasonSortOrder(b);
    });
  },
});

export const getSeason = authenticatedQuery({
  args: {
    seasonId: v.id("pvpSeason"),
  },
  handler: async (ctx, { seasonId }) => {
    return await getSeasonForUser(ctx, seasonId);
  },
});

export const createSeason = authenticatedMutation({
  args: pvpSeasonArgs,
  handler: async (ctx, { name, gameServer, seasonNumber }) => {
    const seasons = await ctx.db
      .query("pvpSeason")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .collect();

    const activeSeasons = seasons.filter((season) => !season.archived);
    const sortOrder = activeSeasons.length
      ? Math.min(...activeSeasons.map(getSeasonSortOrder)) - 1
      : 0;

    const seasonId = await ctx.db.insert("pvpSeason", {
      userId: ctx.user._id,
      name,
      gameServer,
      seasonNumber,
      sortOrder,
    });

    return seasonId;
  },
});

export const reorderSeasons = authenticatedMutation({
  args: {
    seasonIds: v.array(v.id("pvpSeason")),
  },
  handler: async (ctx, { seasonIds }) => {
    const seasons = await ctx.db
      .query("pvpSeason")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .collect();

    const activeSeasons = seasons.filter((season) => !season.archived);
    const requestedSeasons = new Set(seasonIds);

    if (
      requestedSeasons.size !== activeSeasons.length ||
      !activeSeasons.every((season) => requestedSeasons.has(season._id))
    ) {
      throw invalid("Season order must include every active season once.");
    }

    for (const [sortOrder, seasonId] of seasonIds.entries()) {
      await ctx.db.patch(seasonId, {
        sortOrder,
      });
    }
  },
});

export const setSeasonArchived = authenticatedMutation({
  args: {
    seasonId: v.id("pvpSeason"),
    archived: v.boolean(),
  },
  handler: async (ctx, { seasonId, archived }) => {
    await getSeasonForUser(ctx, seasonId);

    if (archived) {
      await ctx.db.patch(seasonId, {
        archived: true,
      });
      return;
    }

    const seasons = await ctx.db
      .query("pvpSeason")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .collect();

    const activeSeasons = seasons.filter(
      (season) => season._id !== seasonId && !season.archived,
    );

    const sortOrder = activeSeasons.length
      ? Math.min(...activeSeasons.map(getSeasonSortOrder)) - 1
      : 0;

    await ctx.db.patch(seasonId, {
      archived: false,
      sortOrder,
    });
  },
});

export const updateSeasonNumber = authenticatedMutation({
  args: {
    seasonId: v.id("pvpSeason"),
    seasonNumber: v.union(...PVP_SEASONS.map((season) => v.literal(season))),
  },
  handler: async (ctx, { seasonId, seasonNumber }) => {
    await getSeasonForUser(ctx, seasonId);
    await ctx.db.patch(seasonId, {
      seasonNumber,
    });
    await queueSeasonRebuild(ctx, seasonId);
  },
});

export const updateSeason = authenticatedMutation({
  args: {
    seasonId: v.id("pvpSeason"),
    ...pvpSeasonArgs,
  },
  handler: async (ctx, { seasonId, name, gameServer, seasonNumber }) => {
    const season = await getSeasonForUser(ctx, seasonId);

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw invalid("Season name cannot be empty.");
    }

    await ctx.db.patch(seasonId, {
      name: trimmedName,
      gameServer,
      seasonNumber,
    });

    if (season.seasonNumber !== seasonNumber) {
      await queueSeasonRebuild(ctx, seasonId);
    }
  },
});

export const getMatchesForSeason = authenticatedQuery({
  args: {
    seasonId: v.id("pvpSeason"),
  },
  handler: async (ctx, { seasonId }) => {
    const season = await ctx.db.get(seasonId);
    if (!season || season.userId !== ctx.user._id) {
      throw notFound("Season not found");
    }

    const matches = await ctx.db
      .query("pvpMatchRecord")
      .withIndex("by_seasonId", (q) => q.eq("seasonId", seasonId))
      .collect();

    return {
      season,
      matches: matches.sort((a, b) => b.date - a.date),
    };
  },
});

export const getSeasonDefaults = authenticatedQuery({
  args: {
    seasonId: v.id("pvpSeason"),
  },
  handler: async (ctx, { seasonId }) => {
    await getSeasonForUser(ctx, seasonId);

    const latest = await ctx.db
      .query("pvpMatchRecord")
      .withIndex("by_seasonId_date", (q) => q.eq("seasonId", seasonId))
      .order("desc")
      .first();

    return {
      season: await ctx.db.get(seasonId),
      ownTeam: latest ? withoutDamage(latest.ownTeam) : emptyTeam(),
    };
  },
});

export const getMatchesForSeasonRange = authenticatedQuery({
  args: {
    seasonId: v.id("pvpSeason"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, { seasonId, startDate, endDate }) => {
    await getSeasonForUser(ctx, seasonId);

    const matches = await ctx.db
      .query("pvpMatchRecord")
      .withIndex("by_seasonId_date", (q) =>
        q.eq("seasonId", seasonId).gte("date", startDate).lte("date", endDate),
      )
      .order("desc")
      .collect();

    return {
      season: await ctx.db.get(seasonId),
      matches,
    };
  },
});

export const getMatchesForDay = authenticatedQuery({
  args: {
    seasonId: v.id("pvpSeason"),
    dayStart: v.number(),
    dayEnd: v.number(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { seasonId, dayStart, dayEnd, paginationOpts }) => {
    await getSeasonForUser(ctx, seasonId);

    const boundedPaginationOpts = {
      ...paginationOpts,
      numItems: Math.min(Math.max(paginationOpts.numItems, 1), 30),
    };

    return await ctx.db
      .query("pvpMatchRecord")
      .withIndex("by_seasonId_date", (q) =>
        q.eq("seasonId", seasonId).gte("date", dayStart).lt("date", dayEnd),
      )
      .order("desc")
      .paginate(boundedPaginationOpts);
  },
});

export const getDayStats = authenticatedQuery({
  args: {
    seasonId: v.id("pvpSeason"),
    dayStart: v.number(),
    dayEnd: v.number(),
  },
  handler: async (ctx, { seasonId, dayStart, dayEnd }) => {
    await getSeasonForUser(ctx, seasonId);

    const matches = await ctx.db
      .query("pvpMatchRecord")
      .withIndex("by_seasonId_date", (q) =>
        q.eq("seasonId", seasonId).gte("date", dayStart).lt("date", dayEnd),
      )
      .collect();

    return matches.reduce(
      (stats, match) => {
        const key = match.matchType === "attack" ? "attack" : "defense";

        if (match.result === "win") {
          stats[key].wins += 1;
        } else {
          stats[key].losses += 1;
        }

        return stats;
      },
      {
        attack: {
          wins: 0,
          losses: 0,
        },
        defense: {
          wins: 0,
          losses: 0,
        },
      },
    );
  },
});

export const listFormationPresets = authenticatedQuery({
  args: {
    seasonId: v.id("pvpSeason"),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { seasonId, search }) => {
    await getSeasonForUser(ctx, seasonId);

    const presets = await ctx.db
      .query("pvpFormationPreset")
      .withIndex("by_userId_seasonId", (q) =>
        q.eq("userId", ctx.user._id).eq("seasonId", seasonId),
      )
      .collect();

    const query = search?.trim().toLowerCase();

    return query
      ? presets.filter((preset) => preset.name.toLowerCase().includes(query))
      : presets;
  },
});

export const listEnemyPresets = authenticatedQuery({
  args: {
    seasonId: v.id("pvpSeason"),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { seasonId, search, paginationOpts }) => {
    await getSeasonForUser(ctx, seasonId);
    const query = search?.trim().toLowerCase();

    const boundedPaginationOpts = {
      ...paginationOpts,
      numItems: Math.min(Math.max(paginationOpts.numItems, 1), 30),
    };

    const page = await stream(ctx.db, schema)
      .query("pvpEnemyPreset")
      .withIndex("by_userId_seasonId_lastRecordedAt", (q: any) =>
        q.eq("userId", ctx.user._id).eq("seasonId", seasonId),
      )
      .order("desc")
      .filterWith(async (preset: any) =>
        query ? enemyPresetMatchesName(preset, query) : true,
      )
      .paginate(boundedPaginationOpts);

    return {
      ...page,
      page: await Promise.all(
        page.page.map(async (preset: any) => ({
          ...preset,
          latestTeam: (await getUniqueEnemyTeamsForPreset(ctx, preset))[0]
            ?.team,
        })),
      ),
    };
  },
});

export const listEnemyPresetsByStudentRep = authenticatedQuery({
  args: {
    seasonId: v.id("pvpSeason"),
    search: v.string(),
    studentIds: v.array(v.string()),
  },
  handler: async (ctx, { seasonId, search, studentIds }) => {
    await getSeasonForUser(ctx, seasonId);
    const query = search.trim().toLowerCase();

    if (!query) {
      return [];
    }

    const presets: Doc<"pvpEnemyPreset">[] = [];

    // studentIds arrive ordered by fuzzy score, so earlier students rank first.
    for (const studentId of studentIds.slice(
      0,
      ENEMY_REP_SEARCH_MAX_STUDENTS,
    )) {
      const matches = await ctx.db
        .query("pvpEnemyPreset")
        .withIndex("by_userId_seasonId_opponentStudentRepId", (q) =>
          q
            .eq("userId", ctx.user._id)
            .eq("seasonId", seasonId)
            .eq("opponentStudentRepId", studentId),
        )
        .collect();

      presets.push(
        ...matches
          .filter((preset) => !enemyPresetMatchesName(preset, query))
          .sort((a, b) => (b.lastRecordedAt ?? 0) - (a.lastRecordedAt ?? 0)),
      );

      if (presets.length >= ENEMY_REP_SEARCH_MAX_RESULTS) {
        break;
      }
    }

    return Promise.all(
      presets.slice(0, ENEMY_REP_SEARCH_MAX_RESULTS).map(async (preset) => ({
        ...preset,
        latestTeam: (await getUniqueEnemyTeamsForPreset(ctx, preset))[0]?.team,
      })),
    );
  },
});

export const getEnemyPreset = authenticatedQuery({
  args: {
    seasonId: v.id("pvpSeason"),
    presetId: v.id("pvpEnemyPreset"),
  },
  handler: async (ctx, { seasonId, presetId }) => {
    const preset = await ctx.db.get(presetId);

    if (
      !preset ||
      preset.userId !== ctx.user._id ||
      preset.seasonId !== seasonId
    ) {
      throw notFound("Preset not found");
    }

    return {
      ...preset,
      latestTeam: (await getUniqueEnemyTeamsForPreset(ctx, preset))[0]?.team,
    };
  },
});

export const getEnemyPresetTeams = authenticatedQuery({
  args: {
    seasonId: v.id("pvpSeason"),
    presetId: v.optional(v.id("pvpEnemyPreset")),
  },
  handler: async (ctx, { seasonId, presetId }) => {
    await getSeasonForUser(ctx, seasonId);
    await validateEnemyPresetForMatch(ctx, presetId, seasonId);

    const preset = presetId ? await ctx.db.get(presetId) : null;

    return {
      preset,
      teams: await getUniqueEnemyTeamsForPreset(ctx, {
        seasonId,
        _id: presetId,
      }),
    };
  },
});

export const getEnemyPresetByName = authenticatedQuery({
  args: {
    seasonId: v.id("pvpSeason"),
    name: v.string(),
    opponentStudentRepId: v.optional(v.string()),
  },
  handler: async (ctx, { seasonId, name, opponentStudentRepId }) => {
    await getSeasonForUser(ctx, seasonId);

    return await findEnemyPresetByName(
      ctx,
      seasonId,
      name,
      opponentStudentRepId,
    );
  },
});

export const getEnemyPresetHistory = authenticatedQuery({
  args: {
    seasonId: v.id("pvpSeason"),
    presetId: v.optional(v.id("pvpEnemyPreset")),
  },
  handler: async (ctx, { seasonId, presetId }) => {
    await getSeasonForUser(ctx, seasonId);
    await validateEnemyPresetForMatch(ctx, presetId, seasonId);

    return {
      preset: presetId ? await ctx.db.get(presetId) : null,
      matches: await getOpponentMatches(ctx, seasonId, presetId),
    };
  },
});

export const getMatchById = authenticatedQuery({
  args: {
    seasonId: v.id("pvpSeason"),
    matchId: v.id("pvpMatchRecord"),
  },
  handler: async (ctx, { matchId, seasonId }) => {
    const match = await ctx.db.get(matchId);
    if (
      !match ||
      match.userId !== ctx.user._id ||
      match.seasonId !== seasonId
    ) {
      throw notFound("Match not found");
    }

    return match;
  },
});

export const recordMatch = authenticatedMutation({
  args: {
    seasonId: v.id("pvpSeason"),
    ...pvpMatchCreateArgs,
  },
  handler: async (
    ctx,
    {
      seasonId,
      date,
      ownRank,
      opponentName,
      opponentStudentRepId,
      enemyPresetId,
      autoCreateEnemyPreset,
      opponentRank,
      matchType,
      ownTeam,
      opponentTeam,
      result,
      videoUrl,
      includeInStatistics,
    },
  ) => {
    const season = await ctx.db.get(seasonId);
    if (!season || season.userId !== ctx.user._id) {
      throw notFound("Season not found");
    }

    validatePvpTeam(ownTeam, "Your team");
    validatePvpTeam(opponentTeam, "Opponent team");

    await validateEnemyPresetForMatch(ctx, enemyPresetId, seasonId);

    const savedOpponentName = autoCreateEnemyPreset
      ? opponentName?.trim() || undefined
      : opponentName;

    let savedEnemyPresetId = enemyPresetId;

    if (autoCreateEnemyPreset && savedOpponentName && !savedEnemyPresetId) {
      const preset = await findEnemyPresetByName(
        ctx,
        seasonId,
        savedOpponentName,
      );

      savedEnemyPresetId =
        preset?._id ??
        (await ctx.db.insert("pvpEnemyPreset", {
          userId: ctx.user._id,
          seasonId,
          name: savedOpponentName,
          opponentName: savedOpponentName,
          opponentStudentRepId,
        }));
    }

    const matchId = await ctx.db.insert("pvpMatchRecord", {
      userId: ctx.user._id,
      seasonId,
      date,
      ownRank,
      opponentName: savedOpponentName,
      opponentStudentRepId,
      enemyPresetId: savedEnemyPresetId,
      opponentRank,
      matchType,
      ownTeam,
      ownTeamKey: getPvpTeamKey(ownTeam),
      opponentTeam,
      opponentTeamKey: getPvpTeamKey(opponentTeam),
      result,
      videoUrl,
      includeInStatistics,
    });

    await queueMatchStats(ctx, await ctx.db.get(matchId));

    if (savedEnemyPresetId) {
      await updateEnemyPresetRecency(ctx, savedEnemyPresetId);
    }

    return matchId;
  },
});

export const bulkImportMatches = staffMutation({
  args: {
    seasonId: v.id("pvpSeason"),
    matches: v.array(
      v.object({
        attackTeam: v.array(
          v.object({
            studentId: v.optional(v.string()),
          }),
        ),
        defenseTeam: v.array(
          v.object({
            studentId: v.optional(v.string()),
          }),
        ),
        attackWins: v.boolean(),
        videoUrl: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { seasonId, matches }) => {
    if (matches.length > 100) {
      throw invalid("Bulk imports are limited to 100 matches per batch.");
    }

    const season = await ctx.db.get(seasonId);
    if (!season || season.userId !== ctx.user._id) {
      throw notFound("Season not found.");
    }

    const date = Date.now();
    for (const imported of matches) {
      validatePvpTeam(imported.attackTeam, "Attack team");
      validatePvpTeam(imported.defenseTeam, "Defense team");

      const matchId = await ctx.db.insert("pvpMatchRecord", {
        userId: ctx.user._id,
        seasonId,
        date,
        matchType: "attack",
        ownTeam: imported.attackTeam,
        ownTeamKey: getPvpTeamKey(imported.attackTeam),
        opponentTeam: imported.defenseTeam,
        opponentTeamKey: getPvpTeamKey(imported.defenseTeam),
        result: imported.attackWins ? "win" : "loss",
        videoUrl: imported.videoUrl,
        includeInStatistics: true,
      });

      await queueMatchStatsForSeason(ctx, await ctx.db.get(matchId), season);
    }

    return matches.length;
  },
});

export const clearSeasonMatches = staffMutation({
  args: {
    seasonId: v.id("pvpSeason"),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { seasonId, cursor }) => {
    const season = await ctx.db.get(seasonId);
    if (!season || season.userId !== ctx.user._id) {
      throw notFound("Season not found.");
    }

    const page = await ctx.db
      .query("pvpMatchRecord")
      .withIndex("by_seasonId", (q) => q.eq("seasonId", seasonId))
      .paginate({
        numItems: 100,
        cursor: cursor ?? null,
      });

    for (const match of page.page) {
      const presetId = match.enemyPresetId;
      await queueMatchRemoval(ctx, match._id);
      await ctx.db.delete(match._id);

      if (presetId) {
        await updateEnemyPresetRecency(ctx, presetId);
      }
    }

    return {
      deleted: page.page.length,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

export const updateMatch = authenticatedMutation({
  args: {
    matchId: v.id("pvpMatchRecord"),
    ...pvpMatchUpdateArgs,
  },
  handler: async (
    ctx,
    {
      matchId,
      date,
      ownRank,
      opponentName,
      opponentStudentRepId,
      enemyPresetId,
      opponentRank,
      matchType,
      ownTeam,
      opponentTeam,
      result,
      videoUrl,
      includeInStatistics,
    },
  ) => {
    const match = await ctx.db.get(matchId);
    if (!match || match.userId !== ctx.user._id) {
      throw notFound("Match not found");
    }

    const nextOwnTeam = ownTeam ?? match.ownTeam;
    const nextOpponentTeam = opponentTeam ?? match.opponentTeam;
    validatePvpTeam(nextOwnTeam, "Your team");
    validatePvpTeam(nextOpponentTeam, "Opponent team");

    const nextEnemyPresetId = enemyPresetId ?? match.enemyPresetId;
    await validateEnemyPresetForMatch(ctx, nextEnemyPresetId, match.seasonId);

    const previousEnemyPresetId = match.enemyPresetId;

    await ctx.db.patch(matchId, {
      date: date ?? match.date,
      ownRank: ownRank ?? match.ownRank,
      opponentName: opponentName ?? match.opponentName,
      opponentStudentRepId: opponentStudentRepId ?? match.opponentStudentRepId,
      enemyPresetId: nextEnemyPresetId,
      opponentRank: opponentRank ?? match.opponentRank,
      matchType: matchType ?? match.matchType,
      ownTeam: nextOwnTeam,
      ownTeamKey: ownTeam ? getPvpTeamKey(ownTeam) : match.ownTeamKey,
      opponentTeam: nextOpponentTeam,
      opponentTeamKey: opponentTeam
        ? getPvpTeamKey(opponentTeam)
        : match.opponentTeamKey,
      result: result ?? match.result,
      videoUrl: videoUrl ?? match.videoUrl,
      includeInStatistics:
        includeInStatistics ?? match.includeInStatistics ?? false,
    });

    await queueMatchStats(ctx, {
      ...match,
      date: date ?? match.date,
      ownRank: ownRank ?? match.ownRank,
      opponentName: opponentName ?? match.opponentName,
      opponentStudentRepId: opponentStudentRepId ?? match.opponentStudentRepId,
      enemyPresetId: nextEnemyPresetId,
      opponentRank: opponentRank ?? match.opponentRank,
      matchType: matchType ?? match.matchType,
      ownTeam: ownTeam ?? match.ownTeam,
      opponentTeam: opponentTeam ?? match.opponentTeam,
      result: result ?? match.result,
      videoUrl: videoUrl ?? match.videoUrl,
      includeInStatistics:
        includeInStatistics ?? match.includeInStatistics ?? false,
    });

    if (previousEnemyPresetId) {
      await updateEnemyPresetRecency(ctx, previousEnemyPresetId);
    }

    if (nextEnemyPresetId && nextEnemyPresetId !== previousEnemyPresetId) {
      await updateEnemyPresetRecency(ctx, nextEnemyPresetId);
    }

    return await ctx.db.get(matchId);
  },
});

export const deleteMatch = authenticatedMutation({
  args: {
    matchId: v.id("pvpMatchRecord"),
  },
  handler: async (ctx, { matchId }) => {
    const match = await ctx.db.get(matchId);
    if (!match || match.userId !== ctx.user._id) {
      throw notFound("Match not found");
    }

    const presetId = match.enemyPresetId;
    await queueMatchRemoval(ctx, matchId);
    await ctx.db.delete(matchId);

    if (presetId) {
      await updateEnemyPresetRecency(ctx, presetId);
    }
  },
});

export const deleteSeason = authenticatedMutation({
  args: {
    seasonId: v.id("pvpSeason"),
  },
  handler: async (ctx, { seasonId }) => {
    const season = await ctx.db.get(seasonId);
    if (!season || season.userId !== ctx.user._id) {
      throw notFound("Season not found");
    }

    // Delete all matches associated with this season
    const matches = await ctx.db
      .query("pvpMatchRecord")
      .withIndex("by_seasonId", (q) => q.eq("seasonId", seasonId))
      .collect();

    for (const match of matches) {
      await queueMatchRemoval(ctx, match._id);
      await ctx.db.delete(match._id);
    }

    const formationPresets = await ctx.db
      .query("pvpFormationPreset")
      .withIndex("by_seasonId", (q) => q.eq("seasonId", seasonId))
      .collect();

    for (const preset of formationPresets) {
      await ctx.db.delete(preset._id);
    }

    const enemyPresets = await ctx.db
      .query("pvpEnemyPreset")
      .withIndex("by_seasonId", (q) => q.eq("seasonId", seasonId))
      .collect();

    for (const preset of enemyPresets) {
      await ctx.db.delete(preset._id);
    }

    const enemyTeams = await ctx.db
      .query("pvpEnemyTeam")
      .withIndex("by_seasonId", (q) => q.eq("seasonId", seasonId))
      .collect();

    for (const team of enemyTeams) {
      await ctx.db.delete(team._id);
    }

    const rebuild = await ctx.db
      .query("pvpStatsRebuild")
      .withIndex("by_seasonId", (q) => q.eq("seasonId", seasonId))
      .unique();
    if (rebuild) {
      await ctx.db.delete(rebuild._id);
    }

    await ctx.db.delete(seasonId);
  },
});

export const createFormationPreset = authenticatedMutation({
  args: {
    seasonId: v.id("pvpSeason"),
    ...pvpFormationPresetCreateArgs,
  },
  handler: async (ctx, { seasonId, name, matchType, team, usedByMe }) => {
    await getSeasonForUser(ctx, seasonId);

    return await ctx.db.insert("pvpFormationPreset", {
      userId: ctx.user._id,
      seasonId,
      name: name.trim(),
      matchType,
      team: withoutDamage(team),
      teamKey: getPvpTeamKey(team),
      usedByMe,
    });
  },
});

export const updateFormationPreset = authenticatedMutation({
  args: {
    presetId: v.id("pvpFormationPreset"),
    ...pvpFormationPresetUpdateArgs,
  },
  handler: async (ctx, { presetId, name, matchType, team, usedByMe }) => {
    const preset = await ctx.db.get(presetId);

    if (!preset || preset.userId !== ctx.user._id) {
      throw notFound("Preset not found");
    }

    await ctx.db.patch(presetId, {
      name: name?.trim() ?? preset.name,
      matchType: matchType ?? preset.matchType,
      team: team ? withoutDamage(team) : preset.team,
      teamKey: team ? getPvpTeamKey(team) : preset.teamKey,
      usedByMe: usedByMe ?? preset.usedByMe,
    });
  },
});

export const deleteFormationPreset = authenticatedMutation({
  args: {
    presetId: v.id("pvpFormationPreset"),
  },
  handler: async (ctx, { presetId }) => {
    const preset = await ctx.db.get(presetId);

    if (!preset || preset.userId !== ctx.user._id) {
      throw notFound("Preset not found");
    }

    await ctx.db.delete(presetId);
  },
});

export const createEnemyPreset = authenticatedMutation({
  args: {
    seasonId: v.id("pvpSeason"),
    ...pvpEnemyPresetCreateArgs,
  },
  handler: async (ctx, args) => {
    await getSeasonForUser(ctx, args.seasonId);

    return await ctx.db.insert("pvpEnemyPreset", {
      userId: ctx.user._id,
      seasonId: args.seasonId,
      name: args.name.trim(),
      opponentName: args.opponentName,
      opponentStudentRepId: args.opponentStudentRepId,
    });
  },
});

export const updateEnemyPreset = authenticatedMutation({
  args: {
    presetId: v.id("pvpEnemyPreset"),
    ...pvpEnemyPresetUpdateArgs,
  },
  handler: async (ctx, { presetId, ...changes }) => {
    const preset = await ctx.db.get(presetId);

    if (!preset || preset.userId !== ctx.user._id) {
      throw notFound("Preset not found");
    }

    await ctx.db.patch(presetId, {
      ...changes,
      name: changes.name?.trim() ?? preset.name,
    });
  },
});

async function mergeManualEnemyTeams(
  ctx: MutationCtx,
  seasonId: Id<"pvpSeason">,
  sourcePresetId: Id<"pvpEnemyPreset">,
  targetPresetId?: Id<"pvpEnemyPreset">,
) {
  const teams = [
    ...(await getManualEnemyTeams(ctx, seasonId, targetPresetId)),
    ...(await getManualEnemyTeams(ctx, seasonId, sourcePresetId)),
  ];

  const byKey = new Map<string, (typeof teams)[number]>();

  for (const team of teams) {
    const teamKey = getPvpTeamKey(team.team);
    const existing = byKey.get(teamKey);

    if (!existing) {
      await ctx.db.patch(team._id, {
        enemyPresetId: targetPresetId,
        teamKey,
      });

      byKey.set(teamKey, team);
      continue;
    }

    const roles = new Set<"attack" | "defense">();
    mergeEnemyRoles(roles, existing.matchType);
    mergeEnemyRoles(roles, team.matchType);

    const newest = team.updatedAt > existing.updatedAt ? team : existing;

    const merged = {
      ...existing,
      teamKey,
      team: newest.team,
      updatedAt: newest.updatedAt,
      matchType: roleFromSet(roles),
    };

    await ctx.db.patch(existing._id, {
      teamKey,
      team: merged.team,
      updatedAt: merged.updatedAt,
      matchType: merged.matchType,
    });

    await ctx.db.delete(team._id);

    byKey.set(teamKey, merged);
  }
}

export const mergeEnemyPresets = authenticatedMutation({
  args: {
    sourcePresetId: v.id("pvpEnemyPreset"),
    targetPresetId: v.id("pvpEnemyPreset"),
  },
  handler: async (ctx, { sourcePresetId, targetPresetId }) => {
    if (sourcePresetId === targetPresetId) {
      throw invalid("Choose a different opponent preset");
    }

    const source = await ctx.db.get(sourcePresetId);
    if (!source || source.userId !== ctx.user._id) {
      throw notFound("Preset not found");
    }

    await getSeasonForUser(ctx, source.seasonId);
    await validateEnemyPresetForMatch(ctx, targetPresetId, source.seasonId);

    const matches = await getOpponentMatches(
      ctx,
      source.seasonId,
      sourcePresetId,
    );

    for (const match of matches) {
      await ctx.db.patch(match._id, {
        enemyPresetId: targetPresetId,
      });
    }

    await mergeManualEnemyTeams(
      ctx,
      source.seasonId,
      sourcePresetId,
      targetPresetId,
    );

    await ctx.db.delete(sourcePresetId);
    await updateEnemyPresetRecency(ctx, targetPresetId);

    return targetPresetId;
  },
});

export const anonymizeEnemyPreset = authenticatedMutation({
  args: {
    presetId: v.id("pvpEnemyPreset"),
  },
  handler: async (ctx, { presetId }) => {
    const preset = await ctx.db.get(presetId);
    if (!preset || preset.userId !== ctx.user._id) {
      throw notFound("Preset not found");
    }

    await getSeasonForUser(ctx, preset.seasonId);

    const matches = await getOpponentMatches(ctx, preset.seasonId, presetId);

    for (const match of matches) {
      await ctx.db.patch(match._id, {
        enemyPresetId: undefined,
        opponentName: undefined,
        opponentStudentRepId: undefined,
      });
    }

    await mergeManualEnemyTeams(ctx, preset.seasonId, presetId);
    await ctx.db.delete(presetId);
  },
});

export const deleteEnemyPreset = authenticatedMutation({
  args: {
    presetId: v.id("pvpEnemyPreset"),
  },
  handler: async (ctx, { presetId }) => {
    const preset = await ctx.db.get(presetId);

    if (!preset || preset.userId !== ctx.user._id) {
      throw notFound("Preset not found");
    }

    const matches = await ctx.db
      .query("pvpMatchRecord")
      .withIndex("by_enemyPresetId_date", (q) =>
        q.eq("enemyPresetId", presetId),
      )
      .collect();

    for (const match of matches) {
      await ctx.db.patch(match._id, {
        enemyPresetId: undefined,
      });
    }

    const teams = await ctx.db
      .query("pvpEnemyTeam")
      .withIndex("by_enemyPresetId", (q) => q.eq("enemyPresetId", presetId))
      .collect();

    for (const team of teams) {
      await ctx.db.delete(team._id);
    }

    await ctx.db.delete(presetId);
  },
});

export const getEnemyTeam = authenticatedQuery({
  args: {
    seasonId: v.id("pvpSeason"),
    teamId: v.id("pvpEnemyTeam"),
  },
  handler: async (ctx, { seasonId, teamId }) => {
    const team = await ctx.db.get(teamId);

    if (!team || team.userId !== ctx.user._id || team.seasonId !== seasonId) {
      throw notFound("Team not found");
    }

    return team;
  },
});

export const createEnemyTeam = authenticatedMutation({
  args: {
    seasonId: v.id("pvpSeason"),
    ...pvpEnemyTeamCreateArgs,
  },
  handler: async (ctx, args) => {
    await getSeasonForUser(ctx, args.seasonId);
    await validateEnemyPresetForMatch(ctx, args.enemyPresetId, args.seasonId);

    if (!args.team.some((item) => item.studentId)) {
      throw invalid("Team must contain at least one student");
    }

    const team = withoutDamage(args.team);
    const teamKey = getPvpTeamKey(team);
    const existing = await findManualEnemyTeam(
      ctx,
      args.seasonId,
      args.enemyPresetId,
      teamKey,
    );
    const updatedAt = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        team,
        matchType:
          existing.matchType === "both" || args.matchType === "both"
            ? "both"
            : existing.matchType === args.matchType
              ? existing.matchType
              : "both",
        updatedAt,
      });

      return existing._id;
    }

    return await ctx.db.insert("pvpEnemyTeam", {
      userId: ctx.user._id,
      seasonId: args.seasonId,
      enemyPresetId: args.enemyPresetId,
      teamKey,
      team,
      matchType: args.matchType,
      updatedAt,
    });
  },
});

export const updateEnemyTeam = authenticatedMutation({
  args: {
    teamId: v.id("pvpEnemyTeam"),
    ...pvpEnemyTeamUpdateArgs,
  },
  handler: async (ctx, args) => {
    const current = await ctx.db.get(args.teamId);

    if (!current || current.userId !== ctx.user._id) {
      throw notFound("Team not found");
    }

    if (args.team && !args.team.some((item) => item.studentId)) {
      throw invalid("Team must contain at least one student");
    }

    const team = args.team ? withoutDamage(args.team) : current.team;
    const teamKey = getPvpTeamKey(team);
    const collision =
      getPvpTeamKey(current.team) === teamKey
        ? null
        : await findManualEnemyTeam(
            ctx,
            current.seasonId,
            current.enemyPresetId,
            teamKey,
          );

    if (collision) {
      await ctx.db.patch(collision._id, {
        matchType:
          collision.matchType === "both" ||
          (args.matchType ?? current.matchType) === "both"
            ? "both"
            : collision.matchType === (args.matchType ?? current.matchType)
              ? collision.matchType
              : "both",
        team,
        updatedAt: Date.now(),
      });

      await ctx.db.delete(current._id);
      return collision._id;
    }

    await ctx.db.patch(current._id, {
      team,
      teamKey,
      matchType: args.matchType ?? current.matchType,
      updatedAt: Date.now(),
    });
    return current._id;
  },
});

export const deleteEnemyTeam = authenticatedMutation({
  args: {
    teamId: v.id("pvpEnemyTeam"),
  },
  handler: async (ctx, { teamId }) => {
    const team = await ctx.db.get(teamId);

    if (!team || team.userId !== ctx.user._id) {
      throw notFound("Team not found");
    }

    await ctx.db.delete(teamId);
  },
});
