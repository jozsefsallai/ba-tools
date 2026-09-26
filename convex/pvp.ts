import {
  GAME_SERVERS,
  type PVPFormationPresetType,
  type PVPMatchType,
  type StarLevel,
  type UELevel,
} from "@/lib/types";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./lib/auth";
import { getTeamKey } from "./lib/teamKey";
import { pvpFormationStudentItem } from "./schema";

const emptyTeam = () => [{}, {}, {}, {}, {}, {}];

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

async function findManualEnemyTeam(ctx: any, presetId: any, teamKey: string) {
  const teams = await ctx.db
    .query("pvpEnemyTeam")
    .withIndex("by_enemyPresetId", (q: any) => q.eq("enemyPresetId", presetId))
    .collect();

  return teams.find(
    (team: any) =>
      team.teamKey === teamKey || getTeamKey(team.team) === teamKey,
  );
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

async function getUniqueEnemyTeamsForPreset(ctx: any, preset: any) {
  const matches = await ctx.db
    .query("pvpMatchRecord")
    .withIndex("by_enemyPresetId_date", (q: any) =>
      q.eq("enemyPresetId", preset._id),
    )
    .order("desc")
    .collect();

  const manualTeams = await ctx.db
    .query("pvpEnemyTeam")
    .withIndex("by_enemyPresetId", (q: any) =>
      q.eq("enemyPresetId", preset._id),
    )
    .collect();

  const byKey = new Map<string, any>();

  const add = (
    team: any[],
    role: PVPFormationPresetType,
    updatedAt: number,
    manualTeamId?: any,
  ) => {
    if (!team.some((item) => item.studentId)) {
      return;
    }

    const normalized = withoutDamage(team);
    const key = getTeamKey(normalized);
    const existing = byKey.get(key);

    if (!existing) {
      const roles = new Set<"attack" | "defense">();

      mergeEnemyRoles(roles, role);

      byKey.set(key, {
        team: normalized,
        teamKey: key,
        roles,
        updatedAt,
        manualTeamId,
      });

      return;
    }

    mergeEnemyRoles(existing.roles, role);
    existing.manualTeamId = manualTeamId ?? existing.manualTeamId;

    if (updatedAt >= existing.updatedAt) {
      existing.team = normalized;
      existing.updatedAt = updatedAt;
    }
  };

  for (const match of matches) {
    add(match.opponentTeam, enemyTeamRole(match.matchType), match.date);
  }

  for (const manual of manualTeams) {
    add(manual.team, manual.matchType, manual.updatedAt, manual._id);
  }

  return [...byKey.values()]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((item) => ({
      ...item,
      roles: roleFromSet(item.roles),
    }));
}

async function getSeasonForUser(ctx: any, seasonId: any) {
  const season = await ctx.db.get(seasonId);

  if (!season || season.userId !== ctx.user._id) {
    throw new Error("Season not found");
  }

  return season;
}

export const getOwnSeasons = authenticatedQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("pvpSeason")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .collect();
  },
});

export const createSeason = authenticatedMutation({
  args: {
    name: v.string(),
    gameServer: v.union(...GAME_SERVERS.map((level) => v.literal(level))),
  },
  handler: async (ctx, { name, gameServer }) => {
    const seasonId = await ctx.db.insert("pvpSeason", {
      userId: ctx.user._id,
      name,
      gameServer,
    });

    return seasonId;
  },
});

export const getMatchesForSeason = authenticatedQuery({
  args: { seasonId: v.id("pvpSeason") },
  handler: async (ctx, { seasonId }) => {
    const season = await ctx.db.get(seasonId);
    if (!season || season.userId !== ctx.user._id) {
      throw new Error("Season not found");
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
  args: { seasonId: v.id("pvpSeason") },
  handler: async (ctx, { seasonId }) => {
    await getSeasonForUser(ctx, seasonId);

    const latest = await ctx.db
      .query("pvpMatchRecord")
      .withIndex("by_seasonId_date", (q) => q.eq("seasonId", seasonId))
      .order("desc")
      .first();

    return {
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

    return await ctx.db
      .query("pvpMatchRecord")
      .withIndex("by_seasonId_date", (q) =>
        q.eq("seasonId", seasonId).gte("date", dayStart).lt("date", dayEnd),
      )
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const listFormationPresets = authenticatedQuery({
  args: { seasonId: v.id("pvpSeason"), search: v.optional(v.string()) },
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
  args: { seasonId: v.id("pvpSeason"), search: v.optional(v.string()) },
  handler: async (ctx, { seasonId, search }) => {
    await getSeasonForUser(ctx, seasonId);

    const presets = await ctx.db
      .query("pvpEnemyPreset")
      .withIndex("by_userId_seasonId", (q) =>
        q.eq("userId", ctx.user._id).eq("seasonId", seasonId),
      )
      .collect();

    const query = search?.trim().toLowerCase();
    const filtered = query
      ? presets.filter(
          (preset) =>
            preset.name.toLowerCase().includes(query) ||
            preset.opponentName?.toLowerCase().includes(query),
        )
      : presets;

    return await Promise.all(
      filtered.map(async (preset) => ({
        ...preset,
        latestTeam: (await getUniqueEnemyTeamsForPreset(ctx, preset))[0]?.team,
      })),
    );
  },
});

export const getEnemyPresetTeams = authenticatedQuery({
  args: { presetId: v.id("pvpEnemyPreset") },
  handler: async (ctx, { presetId }) => {
    const preset = await ctx.db.get(presetId);
    if (!preset || preset.userId !== ctx.user._id) {
      throw new Error("Preset not found");
    }

    return { preset, teams: await getUniqueEnemyTeamsForPreset(ctx, preset) };
  },
});

export const getEnemyPresetByName = authenticatedQuery({
  args: { seasonId: v.id("pvpSeason"), name: v.string() },
  handler: async (ctx, { seasonId, name }) => {
    await getSeasonForUser(ctx, seasonId);

    return await ctx.db
      .query("pvpEnemyPreset")
      .withIndex("by_seasonId_opponentName", (q) =>
        q.eq("seasonId", seasonId).eq("opponentName", name),
      )
      .order("asc")
      .first();
  },
});

export const getEnemyPresetHistory = authenticatedQuery({
  args: { presetId: v.id("pvpEnemyPreset") },
  handler: async (ctx, { presetId }) => {
    const preset = await ctx.db.get(presetId);

    if (!preset || preset.userId !== ctx.user._id) {
      throw new Error("Preset not found");
    }

    return {
      preset,
      matches: await ctx.db
        .query("pvpMatchRecord")
        .withIndex("by_enemyPresetId_date", (q) =>
          q.eq("enemyPresetId", presetId),
        )
        .order("desc")
        .collect(),
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
      throw new Error("Match not found");
    }

    return match;
  },
});

export const recordMatch = authenticatedMutation({
  args: {
    seasonId: v.id("pvpSeason"),
    date: v.number(),
    ownRank: v.optional(v.number()),
    opponentName: v.optional(v.string()),
    opponentStudentRepId: v.optional(v.string()),
    enemyPresetId: v.optional(v.id("pvpEnemyPreset")),
    opponentRank: v.optional(v.number()),
    matchType: v.union(v.literal("attack"), v.literal("defense")),
    ownTeam: v.array(pvpFormationStudentItem),
    opponentTeam: v.array(pvpFormationStudentItem),
    result: v.union(v.literal("win"), v.literal("loss")),
    videoUrl: v.optional(v.string()),
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
      opponentRank,
      matchType,
      ownTeam,
      opponentTeam,
      result,
      videoUrl,
    },
  ) => {
    const season = await ctx.db.get(seasonId);
    if (!season || season.userId !== ctx.user._id) {
      throw new Error("Season not found");
    }

    const matchId = await ctx.db.insert("pvpMatchRecord", {
      userId: ctx.user._id,
      seasonId,
      date,
      ownRank,
      opponentName,
      opponentStudentRepId,
      enemyPresetId,
      opponentRank,
      matchType,
      ownTeam,
      ownTeamKey: getTeamKey(ownTeam),
      opponentTeam,
      opponentTeamKey: getTeamKey(opponentTeam),
      result,
      videoUrl,
    });

    return matchId;
  },
});

export const updateMatch = authenticatedMutation({
  args: {
    matchId: v.id("pvpMatchRecord"),
    date: v.optional(v.number()),
    ownRank: v.optional(v.number()),
    opponentName: v.optional(v.string()),
    opponentStudentRepId: v.optional(v.string()),
    enemyPresetId: v.optional(v.id("pvpEnemyPreset")),
    opponentRank: v.optional(v.number()),
    matchType: v.optional(v.union(v.literal("attack"), v.literal("defense"))),
    ownTeam: v.optional(v.array(pvpFormationStudentItem)),
    opponentTeam: v.optional(v.array(pvpFormationStudentItem)),
    result: v.optional(v.union(v.literal("win"), v.literal("loss"))),
    videoUrl: v.optional(v.string()),
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
    },
  ) => {
    const match = await ctx.db.get(matchId);
    if (!match || match.userId !== ctx.user._id) {
      throw new Error("Match not found");
    }

    await ctx.db.patch(matchId, {
      date: date ?? match.date,
      ownRank: ownRank ?? match.ownRank,
      opponentName: opponentName ?? match.opponentName,
      opponentStudentRepId: opponentStudentRepId ?? match.opponentStudentRepId,
      enemyPresetId: enemyPresetId ?? match.enemyPresetId,
      opponentRank: opponentRank ?? match.opponentRank,
      matchType: matchType ?? match.matchType,
      ownTeam: ownTeam ?? match.ownTeam,
      ownTeamKey: ownTeam ? getTeamKey(ownTeam) : match.ownTeamKey,
      opponentTeam: opponentTeam ?? match.opponentTeam,
      opponentTeamKey: opponentTeam
        ? getTeamKey(opponentTeam)
        : match.opponentTeamKey,
      result: result ?? match.result,
      videoUrl: videoUrl ?? match.videoUrl,
    });

    return await ctx.db.get(matchId);
  },
});

export const deleteMatch = authenticatedMutation({
  args: { matchId: v.id("pvpMatchRecord") },
  handler: async (ctx, { matchId }) => {
    const match = await ctx.db.get(matchId);
    if (!match || match.userId !== ctx.user._id) {
      throw new Error("Match not found");
    }

    await ctx.db.delete(matchId);
  },
});

export const deleteSeason = authenticatedMutation({
  args: { seasonId: v.id("pvpSeason") },
  handler: async (ctx, { seasonId }) => {
    const season = await ctx.db.get(seasonId);
    if (!season || season.userId !== ctx.user._id) {
      throw new Error("Season not found");
    }

    // Delete all matches associated with this season
    const matches = await ctx.db
      .query("pvpMatchRecord")
      .withIndex("by_seasonId", (q) => q.eq("seasonId", seasonId))
      .collect();

    for (const match of matches) {
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

    await ctx.db.delete(seasonId);
  },
});

export const createFormationPreset = authenticatedMutation({
  args: {
    seasonId: v.id("pvpSeason"),
    name: v.string(),
    matchType: v.union(
      v.literal("attack"),
      v.literal("defense"),
      v.literal("both"),
    ),
    team: v.array(pvpFormationStudentItem),
    usedByMe: v.boolean(),
  },
  handler: async (ctx, { seasonId, name, matchType, team, usedByMe }) => {
    await getSeasonForUser(ctx, seasonId);

    return await ctx.db.insert("pvpFormationPreset", {
      userId: ctx.user._id,
      seasonId,
      name: name.trim(),
      matchType,
      team: withoutDamage(team),
      teamKey: getTeamKey(team),
      usedByMe,
    });
  },
});

export const updateFormationPreset = authenticatedMutation({
  args: {
    presetId: v.id("pvpFormationPreset"),
    name: v.optional(v.string()),
    matchType: v.optional(
      v.union(v.literal("attack"), v.literal("defense"), v.literal("both")),
    ),
    team: v.optional(v.array(pvpFormationStudentItem)),
    usedByMe: v.optional(v.boolean()),
  },
  handler: async (ctx, { presetId, name, matchType, team, usedByMe }) => {
    const preset = await ctx.db.get(presetId);

    if (!preset || preset.userId !== ctx.user._id) {
      throw new Error("Preset not found");
    }

    await ctx.db.patch(presetId, {
      name: name?.trim() ?? preset.name,
      matchType: matchType ?? preset.matchType,
      team: team ? withoutDamage(team) : preset.team,
      teamKey: team ? getTeamKey(team) : preset.teamKey,
      usedByMe: usedByMe ?? preset.usedByMe,
    });
  },
});

export const deleteFormationPreset = authenticatedMutation({
  args: { presetId: v.id("pvpFormationPreset") },
  handler: async (ctx, { presetId }) => {
    const preset = await ctx.db.get(presetId);

    if (!preset || preset.userId !== ctx.user._id) {
      throw new Error("Preset not found");
    }

    await ctx.db.delete(presetId);
  },
});

export const createEnemyPreset = authenticatedMutation({
  args: {
    seasonId: v.id("pvpSeason"),
    name: v.string(),
    opponentName: v.optional(v.string()),
    opponentStudentRepId: v.optional(v.string()),
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
    name: v.optional(v.string()),
    opponentName: v.optional(v.string()),
    opponentStudentRepId: v.optional(v.string()),
  },
  handler: async (ctx, { presetId, ...changes }) => {
    const preset = await ctx.db.get(presetId);

    if (!preset || preset.userId !== ctx.user._id) {
      throw new Error("Preset not found");
    }

    await ctx.db.patch(presetId, {
      ...changes,
      name: changes.name?.trim() ?? preset.name,
    });
  },
});

export const deleteEnemyPreset = authenticatedMutation({
  args: { presetId: v.id("pvpEnemyPreset") },
  handler: async (ctx, { presetId }) => {
    const preset = await ctx.db.get(presetId);

    if (!preset || preset.userId !== ctx.user._id) {
      throw new Error("Preset not found");
    }

    const matches = await ctx.db
      .query("pvpMatchRecord")
      .withIndex("by_enemyPresetId_date", (q) =>
        q.eq("enemyPresetId", presetId),
      )
      .collect();

    for (const match of matches) {
      await ctx.db.patch(match._id, { enemyPresetId: undefined });
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

export const createEnemyTeam = authenticatedMutation({
  args: {
    seasonId: v.id("pvpSeason"),
    enemyPresetId: v.id("pvpEnemyPreset"),
    matchType: v.union(
      v.literal("attack"),
      v.literal("defense"),
      v.literal("both"),
    ),
    team: v.array(pvpFormationStudentItem),
  },
  handler: async (ctx, args) => {
    await getSeasonForUser(ctx, args.seasonId);
    const preset = await ctx.db.get(args.enemyPresetId);

    if (
      !preset ||
      preset.userId !== ctx.user._id ||
      preset.seasonId !== args.seasonId
    ) {
      throw new Error("Preset not found");
    }

    if (!args.team.some((item) => item.studentId)) {
      throw new Error("Team must contain at least one student");
    }

    const team = withoutDamage(args.team);
    const teamKey = getTeamKey(team);
    const existing = await findManualEnemyTeam(
      ctx,
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
    matchType: v.optional(
      v.union(v.literal("attack"), v.literal("defense"), v.literal("both")),
    ),
    team: v.optional(v.array(pvpFormationStudentItem)),
  },
  handler: async (ctx, args) => {
    const current = await ctx.db.get(args.teamId);

    if (!current || current.userId !== ctx.user._id) {
      throw new Error("Team not found");
    }

    if (args.team && !args.team.some((item) => item.studentId)) {
      throw new Error("Team must contain at least one student");
    }

    const team = args.team ? withoutDamage(args.team) : current.team;
    const teamKey = getTeamKey(team);
    const collision =
      teamKey === current.teamKey || getTeamKey(current.team) === teamKey
        ? null
        : await findManualEnemyTeam(ctx, current.enemyPresetId, teamKey);

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
  args: { teamId: v.id("pvpEnemyTeam") },
  handler: async (ctx, { teamId }) => {
    const team = await ctx.db.get(teamId);

    if (!team || team.userId !== ctx.user._id) {
      throw new Error("Team not found");
    }

    await ctx.db.delete(teamId);
  },
});
