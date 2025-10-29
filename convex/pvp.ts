import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./lib/auth";
import { GAME_SERVERS } from "@/lib/types";
import { pvpFormationStudentItem } from "./schema";

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
      opponentRank,
      matchType,
      ownTeam,
      opponentTeam,
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
      opponentRank: opponentRank ?? match.opponentRank,
      matchType: matchType ?? match.matchType,
      ownTeam: ownTeam ?? match.ownTeam,
      opponentTeam: opponentTeam ?? match.opponentTeam,
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

    await ctx.db.delete(seasonId);
  },
});
