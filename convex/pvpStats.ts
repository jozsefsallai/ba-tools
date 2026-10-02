import { PVP_SEASONS } from "@/lib/types";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { internal } from "~convex/api";
import type { Doc } from "~convex/dataModel";
import { internalMutation, query } from "~convex/server";
import { getPvpVideoUrl } from "./lib/pvpVideo";
import { getTeamKey } from "./lib/teamKey";

type Team = Array<{ studentId?: string }>;

const seasonNumberValidator = v.union(
  ...PVP_SEASONS.map((season) => v.literal(season)),
);

// Match formations may contain progression and damage fields at runtime. The
// statistics tables intentionally retain only the six ordered student IDs.
function toStudentIdTeam<T extends { studentId?: string }>(team: T[]): Team {
  return team.map((item) => ({ studentId: item.studentId }));
}

function getTeamValidationError(team: Team, label = "Team") {
  if (team.length !== 6 || !team.slice(0, 4).some((item) => item.studentId)) {
    if (team.length !== 6) {
      return `${label} must contain exactly six positions.`;
    }

    return `${label} must contain at least one striker.`;
  }

  const ids = team
    .map((item) => item.studentId)
    .filter((studentId): studentId is string => Boolean(studentId));

  if (ids.length !== new Set(ids).size) {
    return `${label} cannot contain duplicate students.`;
  }

  return null;
}

function isValidTeam(team: Team) {
  return getTeamValidationError(team) === null;
}

export function validatePvpTeam(team: Team, label = "Team") {
  const error = getTeamValidationError(team, label);
  if (error) {
    throw new Error(error);
  }
}

function confidenceScore(wins: number, total: number) {
  if (total === 0) {
    return 0;
  }

  const z = 1.96;
  const proportion = wins / total;
  const denominator = 1 + (z * z) / total;
  const center = proportion + (z * z) / (2 * total);
  const spread =
    z *
    Math.sqrt((proportion * (1 - proportion) + (z * z) / (4 * total)) / total);

  return (center - spread) / denominator;
}

export function normalizeMatchForStats(
  match: Doc<"pvpMatchRecord">,
  seasonNumber?: number,
) {
  if (
    !match.includeInStatistics ||
    !seasonNumber ||
    !PVP_SEASONS.includes(seasonNumber as (typeof PVP_SEASONS)[number]) ||
    !isValidTeam(match.ownTeam) ||
    !isValidTeam(match.opponentTeam)
  ) {
    return null;
  }

  const attackTeam =
    match.matchType === "attack" ? match.ownTeam : match.opponentTeam;
  const defenseTeam =
    match.matchType === "attack" ? match.opponentTeam : match.ownTeam;
  const attackWon =
    match.matchType === "attack"
      ? match.result === "win"
      : match.result === "loss";

  return {
    seasonNumber: seasonNumber as (typeof PVP_SEASONS)[number],
    attackTeam: toStudentIdTeam(attackTeam),
    defenseTeam: toStudentIdTeam(defenseTeam),
    attackTeamKey: getTeamKey(attackTeam),
    defenseTeamKey: getTeamKey(defenseTeam),
    attackWon,
  };
}

async function upsertPending(ctx: any, match: any, season: any) {
  const normalized = normalizeMatchForStats(match, season?.seasonNumber);
  const existing = await ctx.db
    .query("pvpStatsPending")
    .withIndex("by_matchId", (q: any) => q.eq("matchId", match._id))
    .unique();

  const value = normalized
    ? {
        matchId: match._id,
        queuedAt: Date.now(),
        remove: false,
        ...normalized,
      }
    : {
        matchId: match._id,
        queuedAt: Date.now(),
        remove: true,
      };

  if (existing) {
    await ctx.db.patch(existing._id, value);
  } else {
    await ctx.db.insert("pvpStatsPending", value);
  }
}

export async function queueMatchStats(ctx: any, match: any) {
  const season = await ctx.db.get(match.seasonId);
  await queueMatchStatsForSeason(ctx, match, season);
}

export async function queueMatchStatsForSeason(
  ctx: any,
  match: any,
  season: any,
) {
  await upsertPending(ctx, match, season);
}

export async function queueMatchRemoval(ctx: any, matchId: any) {
  const existing = await ctx.db
    .query("pvpStatsPending")
    .withIndex("by_matchId", (q: any) => q.eq("matchId", matchId))
    .unique();
  const value = { matchId, queuedAt: Date.now(), remove: true };

  if (existing) {
    await ctx.db.patch(existing._id, value);
  } else {
    await ctx.db.insert("pvpStatsPending", value);
  }
}

export async function queueSeasonRebuild(ctx: any, seasonId: any) {
  const existing = await ctx.db
    .query("pvpStatsRebuild")
    .withIndex("by_seasonId", (q: any) => q.eq("seasonId", seasonId))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, { cursor: undefined });
  } else {
    await ctx.db.insert("pvpStatsRebuild", { seasonId });
  }
}

async function removeContribution(ctx: any, contribution: any) {
  const aggregate = await ctx.db
    .query("pvpStatsAggregate")
    .withIndex("by_matchup", (q: any) =>
      q
        .eq("seasonNumber", contribution.seasonNumber)
        .eq("defenseTeamKey", contribution.defenseTeamKey)
        .eq("attackTeamKey", contribution.attackTeamKey),
    )
    .unique();

  if (aggregate) {
    const total = aggregate.total - 1;
    const wins = aggregate.wins - (contribution.attackWon ? 1 : 0);

    if (total <= 0) {
      await ctx.db.delete(aggregate._id);
    } else {
      await ctx.db.patch(aggregate._id, {
        total,
        wins,
        confidenceScore: confidenceScore(wins, total),
      });
    }
  }

  await adjustSummary(
    ctx,
    contribution.seasonNumber,
    -1,
    contribution.attackWon ? -1 : 0,
  );
}

async function adjustSummary(
  ctx: any,
  seasonNumber: (typeof PVP_SEASONS)[number],
  totalMatchesDelta: number,
  clearsDelta: number,
) {
  const existing = await ctx.db
    .query("pvpStatsSummary")
    .withIndex("by_seasonNumber", (q: any) =>
      q.eq("seasonNumber", seasonNumber),
    )
    .unique();

  if (!existing && totalMatchesDelta < 0) {
    return;
  }

  if (!existing) {
    const aggregates = await ctx.db
      .query("pvpStatsAggregate")
      .withIndex("by_seasonNumber", (q: any) =>
        q.eq("seasonNumber", seasonNumber),
      )
      .collect();
    const totalMatches = aggregates.reduce(
      (total: number, aggregate: any) => total + aggregate.total,
      0,
    );
    const clears = aggregates.reduce(
      (total: number, aggregate: any) => total + aggregate.wins,
      0,
    );

    if (totalMatches > 0) {
      await ctx.db.insert("pvpStatsSummary", {
        seasonNumber,
        totalMatches,
        clears,
      });
    }
    return;
  }

  const totalMatches = existing.totalMatches + totalMatchesDelta;
  const clears = existing.clears + clearsDelta;

  if (totalMatches <= 0) {
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return;
  }

  await ctx.db.patch(existing._id, { totalMatches, clears });
}

async function getAggregateSummary(ctx: any, seasonNumber: any) {
  const aggregates = await ctx.db
    .query("pvpStatsAggregate")
    .withIndex("by_seasonNumber", (q: any) =>
      q.eq("seasonNumber", seasonNumber),
    )
    .collect();

  return {
    seasonNumber,
    totalMatches: aggregates.reduce(
      (total: number, aggregate: any) => total + aggregate.total,
      0,
    ),
    clears: aggregates.reduce(
      (total: number, aggregate: any) => total + aggregate.wins,
      0,
    ),
  };
}

async function addContribution(ctx: any, value: any) {
  const aggregate = await ctx.db
    .query("pvpStatsAggregate")
    .withIndex("by_matchup", (q: any) =>
      q
        .eq("seasonNumber", value.seasonNumber)
        .eq("defenseTeamKey", value.defenseTeamKey)
        .eq("attackTeamKey", value.attackTeamKey),
    )
    .unique();
  const total = (aggregate?.total ?? 0) + 1;
  const wins = (aggregate?.wins ?? 0) + (value.attackWon ? 1 : 0);

  if (aggregate) {
    await ctx.db.patch(aggregate._id, {
      total,
      wins,
      confidenceScore: confidenceScore(wins, total),
    });
  } else {
    await ctx.db.insert("pvpStatsAggregate", {
      seasonNumber: value.seasonNumber,
      attackTeamKey: value.attackTeamKey,
      defenseTeamKey: value.defenseTeamKey,
      attackTeam: value.attackTeam,
      defenseTeam: value.defenseTeam,
      total,
      wins,
      confidenceScore: confidenceScore(wins, total),
    });
  }

  await adjustSummary(ctx, value.seasonNumber, 1, value.attackWon ? 1 : 0);
}

async function processPending(ctx: any, pending: any) {
  const contribution = await ctx.db
    .query("pvpStatsContribution")
    .withIndex("by_matchId", (q: any) => q.eq("matchId", pending.matchId))
    .unique();

  if (contribution) {
    await removeContribution(ctx, contribution);
    await ctx.db.delete(contribution._id);
  }

  if (!pending.remove) {
    await addContribution(ctx, pending);

    const match = await ctx.db.get(pending.matchId);

    await ctx.db.insert("pvpStatsContribution", {
      matchId: pending.matchId,
      seasonNumber: pending.seasonNumber,
      attackTeamKey: pending.attackTeamKey,
      defenseTeamKey: pending.defenseTeamKey,
      attackWon: pending.attackWon,
      videoUrl: getPvpVideoUrl(match?.videoUrl),
    });
  }

  await ctx.db.delete(pending._id);
}

async function processRebuild(ctx: any, rebuild: any) {
  const season = await ctx.db.get(rebuild.seasonId);
  if (!season?.seasonNumber) {
    await ctx.db.delete(rebuild._id);
    return false;
  }

  const page = await ctx.db
    .query("pvpMatchRecord")
    .withIndex("by_seasonId", (q: any) => q.eq("seasonId", rebuild.seasonId))
    .paginate({ numItems: 100, cursor: rebuild.cursor ?? null });

  for (const match of page.page) {
    await upsertPending(ctx, match, season);
  }

  if (page.isDone) {
    await ctx.db.delete(rebuild._id);
    return false;
  }

  await ctx.db.patch(rebuild._id, { cursor: page.continueCursor });
  return true;
}

export const start = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    console.info("[pvpStats] refresh started", now);
    const existing = await ctx.db
      .query("pvpStatsStatus")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
    const value = {
      key: "global" as const,
      isUpdating: true,
      nextExpectedAt: now + 6 * 60 * 60 * 1000,
    };

    if (existing) {
      await ctx.db.patch(existing._id, value);
    } else {
      await ctx.db.insert("pvpStatsStatus", value);
    }

    await ctx.scheduler.runAfter(0, internal.pvpStats.process, {});
  },
});

export const process = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rebuild = await ctx.db.query("pvpStatsRebuild").first();
    let rebuildHasMore = false;
    if (rebuild) {
      rebuildHasMore = await processRebuild(ctx, rebuild);
    }

    const pending = await ctx.db
      .query("pvpStatsPending")
      .withIndex("by_queuedAt")
      .order("asc")
      .take(100);

    for (const item of pending) {
      await processPending(ctx, item);
    }

    console.info("[pvpStats] batch processed", pending.length);

    const anotherRebuild = await ctx.db.query("pvpStatsRebuild").first();
    const hasMore =
      pending.length === 100 || rebuildHasMore || Boolean(anotherRebuild);
    if (hasMore) {
      console.info("[pvpStats] continuation scheduled", {
        processed: pending.length,
        pendingBacklogAtLeast: pending.length === 100 ? 100 : 0,
        rebuildHasMore,
        anotherRebuild: Boolean(anotherRebuild),
      });
      await ctx.scheduler.runAfter(0, internal.pvpStats.process, {});
      return;
    }

    const status = await ctx.db
      .query("pvpStatsStatus")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
    if (status) {
      await ctx.db.patch(status._id, {
        isUpdating: false,
        lastCompletedAt: Date.now(),
      });
      console.info("[pvpStats] refresh completed", {
        remainingBacklog: 0,
      });
    }
  },
});

export const search = query({
  args: {
    seasonNumber: seasonNumberValidator,
    defenseTeam: v.array(v.object({ studentId: v.optional(v.string()) })),
    excludedStudentIds: v.array(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (
    ctx,
    { seasonNumber, defenseTeam, excludedStudentIds, paginationOpts },
  ) => {
    if (!isValidTeam(defenseTeam)) {
      throw new Error("A defense must contain at least one striker.");
    }

    const defenseTeamKey = getTeamKey(defenseTeam);
    const excluded = new Set(excludedStudentIds);
    const aggregateQuery = ctx.db
      .query("pvpStatsAggregate")
      .withIndex("by_ranking", (q: any) =>
        q.eq("seasonNumber", seasonNumber).eq("defenseTeamKey", defenseTeamKey),
      )
      .order("desc");

    // Filtering after a single database page can produce an empty page when
    // its highest-ranked teams contain excluded students. Keep consuming the
    // ranking until at least one eligible result is found or the index is
    // exhausted. Each response still contains at most one database page, so
    // pagination remains bounded and the continuation cursor is exact.
    const filteredPage = [];
    let cursor = paginationOpts.cursor;
    let isDone = false;
    let continueCursor = cursor ?? "";

    while (filteredPage.length === 0 && !isDone) {
      const page = await aggregateQuery.paginate({
        numItems: paginationOpts.numItems,
        cursor,
      });

      continueCursor = page.continueCursor;
      isDone = page.isDone;

      for (const item of page.page) {
        if (
          item.attackTeam.every(
            (student) => !student.studentId || !excluded.has(student.studentId),
          )
        ) {
          filteredPage.push({
            attackTeam: item.attackTeam,
            wins: item.wins,
            losses: item.total - item.wins,
            total: item.total,
            successRate: item.wins / item.total,
            confidenceScore: item.confidenceScore,
          });
        }
      }

      cursor = page.continueCursor;
    }

    return {
      page: filteredPage,
      isDone,
      continueCursor,
    };
  },
});

export const getMatchVideos = query({
  args: {
    seasonNumber: seasonNumberValidator,
    attackTeam: v.array(v.object({ studentId: v.optional(v.string()) })),
    defenseTeam: v.array(v.object({ studentId: v.optional(v.string()) })),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(v.string()),
  handler: async (
    ctx,
    { seasonNumber, attackTeam, defenseTeam, paginationOpts },
  ) => {
    validatePvpTeam(attackTeam);
    validatePvpTeam(defenseTeam);

    const attackTeamKey = getTeamKey(attackTeam);
    const defenseTeamKey = getTeamKey(defenseTeam);

    const page = await ctx.db
      .query("pvpStatsContribution")
      .withIndex("by_matchup_videoUrl", (q) =>
        q
          .eq("seasonNumber", seasonNumber)
          .eq("defenseTeamKey", defenseTeamKey)
          .eq("attackTeamKey", attackTeamKey)
          .gt("videoUrl", undefined),
      )
      .paginate({
        ...paginationOpts,
        numItems: Math.min(paginationOpts.numItems, 20),
        maximumRowsRead: Math.min(paginationOpts.maximumRowsRead ?? 30, 30),
      });

    const videos = await Promise.all(
      page.page.map(async (contribution) => {
        const match = await ctx.db.get(contribution.matchId);

        if (!match?.includeInStatistics) {
          return null;
        }

        const season = await ctx.db.get(match.seasonId);
        const normalized = normalizeMatchForStats(match, season?.seasonNumber);

        if (
          !normalized ||
          normalized.seasonNumber !== seasonNumber ||
          normalized.attackTeamKey !== attackTeamKey ||
          normalized.defenseTeamKey !== defenseTeamKey
        ) {
          return null;
        }

        return getPvpVideoUrl(match.videoUrl) ?? null;
      }),
    );

    return {
      ...page,
      page: videos.filter((url): url is string => url !== null),
    };
  },
});

export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const status = await ctx.db
      .query("pvpStatsStatus")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();

    return (
      status ?? {
        lastCompletedAt: undefined,
        nextExpectedAt: undefined,
        isUpdating: false,
      }
    );
  },
});

export const getSummary = query({
  args: { seasonNumber: seasonNumberValidator },
  handler: async (ctx, { seasonNumber }) => {
    const summary = await ctx.db
      .query("pvpStatsSummary")
      .withIndex("by_seasonNumber", (q) => q.eq("seasonNumber", seasonNumber))
      .unique();

    return summary ?? (await getAggregateSummary(ctx, seasonNumber));
  },
});
