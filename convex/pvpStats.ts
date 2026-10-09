import { PVP_COUNTER_RANGES, PVP_SEASONS } from "@/lib/types";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { type Infer, v } from "convex/values";
import { internal } from "~convex/api";
import type { Doc } from "~convex/dataModel";
import { internalAction, internalMutation, query } from "~convex/server";
import { rankingIdentity, wilsonInterval } from "./lib/pvpRankings";
import { getPvpVideoUrl } from "./lib/pvpVideo";
import { getTeamKey } from "./lib/teamKey";

type Team = Array<{ studentId?: string }>;

const searchSlotValidator = v.object({
  studentId: v.optional(v.string()),
  range: v.optional(v.number()),
  tank: v.optional(v.boolean()),
});

const searchModeValidator = v.union(v.literal("primary"), v.literal("similar"));

type SearchSlot = Infer<typeof searchSlotValidator>;

const studentMetadataValidator = v.object({
  studentId: v.string(),
  range: v.number(),
  isTank: v.boolean(),
});

type StudentMetadata = Infer<typeof studentMetadataValidator>;

type StudentApiRecord = {
  id: string;
  range: number;
  combatRole: string;
};

const seasonNumberValidator = v.union(
  ...PVP_SEASONS.map((season) => v.literal(season)),
);

function hasStrikerStudent(team: Team) {
  return team.slice(0, 4).some((item) => Boolean(item.studentId));
}

function getStudentIds(team: Team) {
  return team.flatMap((item) => (item.studentId ? [item.studentId] : []));
}

function hasDuplicateStudentIds(team: Team) {
  const ids = getStudentIds(team);
  return ids.length !== new Set(ids).size;
}

function hasSearchCriterion(slot: SearchSlot) {
  return (
    Boolean(slot.studentId) || slot.range !== undefined || slot.tank === true
  );
}

function hasInvalidTankCriterion(slot: SearchSlot) {
  return !slot.studentId && slot.tank !== undefined && slot.tank !== true;
}

function isSupportedCounterRange(range: number) {
  return PVP_COUNTER_RANGES.includes(
    range as (typeof PVP_COUNTER_RANGES)[number],
  );
}

function hasUnsupportedRangeCriterion(slot: SearchSlot) {
  return slot.range !== undefined && !isSupportedCounterRange(slot.range);
}

function isValidSpecialSearchSlot(slot: SearchSlot) {
  return (
    slot.range === undefined &&
    slot.tank === undefined &&
    (slot.studentId === undefined || Boolean(slot.studentId))
  );
}

function hasCompleteSimilarityMetadataSlot(slot: SearchSlot) {
  return (
    !slot.studentId ||
    (slot.range !== undefined &&
      slot.range > 0 &&
      typeof slot.tank === "boolean")
  );
}

function isSimilarityIndexableSlot(slot: SearchSlot, index: number) {
  return (
    index >= 4 ||
    Boolean(slot.studentId) ||
    (slot.range === undefined && slot.tank === undefined)
  );
}

function isExactSearchSlot(slot: SearchSlot, index: number) {
  return (
    index >= 4 ||
    slot.studentId !== undefined ||
    (slot.range === undefined && slot.tank === undefined)
  );
}

function hasCompleteSimilarityMetadata(team: SearchSlot[]) {
  return team.slice(0, 4).every(hasCompleteSimilarityMetadataSlot);
}

function isSimilarityIndexableSearch(team: SearchSlot[]) {
  return team.every(isSimilarityIndexableSlot);
}

function isExactDefenseSearch(team: SearchSlot[]) {
  return team.every(isExactSearchSlot);
}

function isStudentApiRecord(value: unknown): value is StudentApiRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.range === "number" &&
    typeof record.combatRole === "string"
  );
}

function hasValidStudentMetadataRecords(
  value: unknown,
): value is StudentApiRecord[] {
  return Array.isArray(value) && value.every(isStudentApiRecord);
}

function hasDuplicateStudentApiRecordIds(records: StudentApiRecord[]) {
  const ids = records.map((student) => student.id);
  return ids.length !== new Set(ids).size;
}

function toStudentIdTeam<T extends { studentId?: string }>(team: T[]): Team {
  return team.map((item) => ({ studentId: item.studentId }));
}

function getSpecialTeamKey(team: Team) {
  return getTeamKey(team.slice(4));
}

function getTeamProjection(
  team: Team,
  metadata: Map<string, StudentMetadata>,
  side: "attack" | "defense",
) {
  const traits = team
    .slice(0, 4)
    .map(({ studentId }) => (studentId ? metadata.get(studentId) : undefined));

  const ids = team.slice(0, 4).map(({ studentId }) => studentId);
  const ranges = traits.map((item) => item?.range);
  const tanks = traits.map((item) => item?.isTank);
  const prefix = side === "attack" ? "a" : "d";
  const specialPrefix = side === "attack" ? "attack" : "defense";

  const projection = {
    [`${prefix}1StudentId`]: ids[0],
    [`${prefix}2StudentId`]: ids[1],
    [`${prefix}3StudentId`]: ids[2],
    [`${prefix}4StudentId`]: ids[3],
    [`${specialPrefix}S1StudentId`]: team[4]?.studentId,
    [`${specialPrefix}S2StudentId`]: team[5]?.studentId,
    [`${specialPrefix}SpecialTeamKey`]: getSpecialTeamKey(team),
  };

  return {
    ...projection,
    ...(metadata.size > 0
      ? {
          [`${prefix}1Range`]: ranges[0] ?? 0,
          [`${prefix}1Tank`]: tanks[0] ?? false,
          [`${prefix}2Range`]: ranges[1] ?? 0,
          [`${prefix}2Tank`]: tanks[1] ?? false,
          [`${prefix}3Range`]: ranges[2] ?? 0,
          [`${prefix}3Tank`]: tanks[2] ?? false,
          [`${prefix}4Range`]: ranges[3] ?? 0,
          [`${prefix}4Tank`]: tanks[3] ?? false,
        }
      : {}),
  };
}

function getAggregateTraits(
  attackTeam: Team,
  defenseTeam: Team,
  metadata: Map<string, StudentMetadata>,
) {
  return {
    ...getTeamProjection(attackTeam, metadata, "attack"),
    ...getTeamProjection(defenseTeam, metadata, "defense"),
  };
}

function getStoredTeam(item: any, side: "attack" | "defense"): Team {
  const prefix = side === "attack" ? "a" : "d";
  const specialPrefix = side === "attack" ? "attack" : "defense";

  const projected = [
    { studentId: item[`${prefix}1StudentId`] },
    { studentId: item[`${prefix}2StudentId`] },
    { studentId: item[`${prefix}3StudentId`] },
    { studentId: item[`${prefix}4StudentId`] },
    { studentId: item[`${specialPrefix}S1StudentId`] },
    { studentId: item[`${specialPrefix}S2StudentId`] },
  ];

  const legacy: Team | undefined = item[`${side}Team`];

  return projected.map((slot, index) => ({
    studentId: slot.studentId ?? legacy?.[index]?.studentId,
  }));
}

const defenseTraitFields = [
  { studentId: "d1StudentId", range: "d1Range", tank: "d1Tank" },
  { studentId: "d2StudentId", range: "d2Range", tank: "d2Tank" },
  { studentId: "d3StudentId", range: "d3Range", tank: "d3Tank" },
  { studentId: "d4StudentId", range: "d4Range", tank: "d4Tank" },
] as const;

function validSearchTeam(team: SearchSlot[]) {
  const strikerSlots = team.slice(0, 4);
  const specialSlots = team.slice(4);
  const hasStrikerCriterion = strikerSlots.some(hasSearchCriterion);

  if (team.length !== 6 || !hasStrikerCriterion) {
    return false;
  }

  if (hasDuplicateStudentIds(team)) {
    return false;
  }

  const hasInvalidTank = strikerSlots.some(hasInvalidTankCriterion);
  if (hasInvalidTank) {
    return false;
  }

  const hasUnsupportedRange = strikerSlots.some(hasUnsupportedRangeCriterion);
  if (hasUnsupportedRange) {
    return false;
  }

  return specialSlots.every(isValidSpecialSearchSlot);
}

function getSearchTeamFilter(q: any, team: SearchSlot[], similar = false) {
  return q.and(
    ...team.map((slot, index) => {
      if (index >= 4) {
        const field = index === 4 ? "defenseS1StudentId" : "defenseS2StudentId";
        return q.eq(q.field(field), slot.studentId);
      }

      const fields = defenseTraitFields[index];
      if (similar && slot.studentId) {
        return q.and(
          q.eq(q.field(fields.range), slot.range),
          q.eq(q.field(fields.tank), slot.tank),
        );
      }

      if (slot.studentId) {
        return q.eq(q.field(fields.studentId), slot.studentId);
      }
      if (slot.range !== undefined) {
        return q.eq(q.field(fields.range), slot.range);
      }
      if (slot.tank === true) {
        return q.eq(q.field(fields.tank), true);
      }

      return q.eq(q.field(fields.studentId), undefined);
    }),
  );
}

function getSearchAnchor(team: SearchSlot[]) {
  for (let index = 0; index < 4; index += 1) {
    const slot = team[index];
    if (slot.studentId) {
      return { index, kind: "student_id", value: slot.studentId } as const;
    }
  }

  for (let index = 0; index < 4; index += 1) {
    const slot = team[index];
    if (!slot.studentId && slot.range !== undefined) {
      return { index, kind: "range", value: slot.range } as const;
    }
  }

  for (let index = 0; index < 4; index += 1) {
    const slot = team[index];
    if (!slot.studentId && slot.tank === true) {
      return { index, kind: "tank", value: true } as const;
    }
  }

  return null;
}

function getTeamValidationError(team: Team, label = "Team") {
  if (team.length !== 6 || !hasStrikerStudent(team)) {
    if (team.length !== 6) {
      return `${label} must contain exactly six positions.`;
    }

    return `${label} must contain at least one striker.`;
  }

  if (hasDuplicateStudentIds(team)) {
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
  return wilsonInterval(wins, total).lower;
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

async function addContribution(
  ctx: any,
  value: any,
  metadata: Map<string, StudentMetadata>,
) {
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

  const traits = getAggregateTraits(
    value.attackTeam,
    value.defenseTeam,
    metadata,
  );

  if (aggregate) {
    await ctx.db.patch(aggregate._id, {
      total,
      wins,
      confidenceScore: confidenceScore(wins, total),
      ...traits,
    });
  } else {
    await ctx.db.insert("pvpStatsAggregate", {
      seasonNumber: value.seasonNumber,
      attackTeamKey: value.attackTeamKey,
      defenseTeamKey: value.defenseTeamKey,
      ...traits,
      total,
      wins,
      confidenceScore: confidenceScore(wins, total),
    });
  }

  await adjustSummary(ctx, value.seasonNumber, 1, value.attackWon ? 1 : 0);
}

async function processPending(
  ctx: any,
  pending: any,
  metadata: Map<string, StudentMetadata>,
) {
  const contribution = await ctx.db
    .query("pvpStatsContribution")
    .withIndex("by_matchId", (q: any) => q.eq("matchId", pending.matchId))
    .unique();

  if (contribution) {
    await removeContribution(ctx, contribution);
    await ctx.db.delete(contribution._id);
  }

  if (!pending.remove) {
    await addContribution(ctx, pending, metadata);

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

    if (
      existing?.isUpdating &&
      existing.refreshRunId &&
      now - (existing.refreshHeartbeatAt ?? 0) < 20 * 60_000
    ) {
      return;
    }

    const previousRunAt = Number.parseInt(existing?.refreshRunId ?? "0", 10);
    const refreshRunId = String(Math.max(now, previousRunAt + 1)).padStart(
      16,
      "0",
    );

    const value = {
      key: "global" as const,
      refreshRunId,
      refreshHeartbeatAt: now,
      refreshPhase: "stats" as const,
      rankingCursor: undefined,
      isUpdating: true,
      nextExpectedAt: now + 6 * 60 * 60 * 1000,
      traitsReady: false,
    };

    if (existing) {
      await ctx.db.patch(existing._id, value);
    } else {
      await ctx.db.insert("pvpStatsStatus", value);
    }

    await ctx.scheduler.runAfter(0, internal.pvpStats.processStats, {
      refreshRunId,
    });
  },
});

export const processStatsBatch = internalMutation({
  args: {
    students: v.array(studentMetadataValidator),
    refreshRunId: v.optional(v.string()),
    aggregateCursor: v.optional(v.string()),
  },
  handler: async (ctx, { students, aggregateCursor, refreshRunId }) => {
    const metadata = new Map(
      students.map((student) => [student.studentId, student]),
    );

    const status = await ctx.db
      .query("pvpStatsStatus")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();

    if (
      !refreshRunId ||
      status?.refreshRunId !== refreshRunId ||
      status.refreshPhase !== "stats"
    ) {
      return { hasMore: false, aggregateCursor: undefined };
    }

    await ctx.db.patch(status._id, { refreshHeartbeatAt: Date.now() });

    if (students.length > 0 && !status?.traitsReady) {
      const page = await ctx.db
        .query("pvpStatsAggregate")
        .paginate({ numItems: 100, cursor: aggregateCursor ?? null });

      for (const aggregate of page.page) {
        await ctx.db.patch(
          aggregate._id,
          getAggregateTraits(
            getStoredTeam(aggregate, "attack"),
            getStoredTeam(aggregate, "defense"),
            metadata,
          ),
        );
      }

      if (page.isDone && status) {
        await ctx.db.patch(status._id, {
          traitsReady: true,
          traitsUpdatedAt: Date.now(),
        });
      }

      // Convex allows only one paginated query per mutation. Even the final
      // trait page must defer season rebuild pagination to the next batch.
      return {
        hasMore: true,
        aggregateCursor: page.isDone ? undefined : page.continueCursor,
      };
    }

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
      await processPending(ctx, item, metadata);
    }

    console.info("[pvpStats] batch processed", pending.length);

    const anotherRebuild = await ctx.db.query("pvpStatsRebuild").first();

    const hasMore =
      pending.length === 100 || rebuildHasMore || Boolean(anotherRebuild);

    if (hasMore) {
      console.info("[pvpStats] batch has more work", {
        processed: pending.length,
        pendingBacklogAtLeast: pending.length === 100 ? 100 : 0,
        rebuildHasMore,
        anotherRebuild: Boolean(anotherRebuild),
      });

      return { hasMore: true, aggregateCursor: undefined };
    }

    await ctx.db.patch(status._id, {
      refreshPhase: "rankings",
      rankingCursor: undefined,
      ...(students.length > 0
        ? { traitsReady: true, traitsUpdatedAt: Date.now() }
        : {}),
    });

    await ctx.scheduler.runAfter(0, internal.pvpStats.processRankingBatch, {
      refreshRunId,
    });

    return { hasMore: false, aggregateCursor: undefined };
  },
});

export const processStats = internalAction({
  args: {
    students: v.optional(v.array(studentMetadataValidator)),
    refreshRunId: v.optional(v.string()),
    aggregateCursor: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { students: providedStudents, aggregateCursor, refreshRunId },
  ) => {
    let students = providedStudents;

    if (!students) {
      const source =
        process.env.PVP_STUDENT_DATA_URL ??
        "https://ba.joexyz.online/api/students";

      students = [];

      try {
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(
            `Student metadata request failed: ${response.status}`,
          );
        }

        const value = await response.json();
        if (!Array.isArray(value)) {
          throw new Error("Invalid student metadata payload");
        }

        if (!hasValidStudentMetadataRecords(value)) {
          throw new Error("Invalid student metadata record");
        }

        if (hasDuplicateStudentApiRecordIds(value)) {
          throw new Error("Duplicate student metadata record");
        }

        students = value.flatMap((student) =>
          student.range > 0
            ? [
                {
                  studentId: student.id,
                  range: student.range,
                  isTank:
                    student.combatRole === "Tanker" ||
                    student.combatRole === "Tank",
                },
              ]
            : [],
        );
      } catch (error) {
        console.error("[pvpStats] student metadata refresh failed", error);
      }
    }

    const result = await ctx.runMutation(internal.pvpStats.processStatsBatch, {
      students,
      aggregateCursor,
      refreshRunId,
    });

    if (result.hasMore) {
      await ctx.scheduler.runAfter(0, internal.pvpStats.processStats, {
        students,
        aggregateCursor: result.aggregateCursor,
        refreshRunId,
      });
    }
  },
});

export const search = query({
  args: {
    seasonNumber: seasonNumberValidator,
    defenseTeam: v.array(searchSlotValidator),
    excludedStudentIds: v.array(v.string()),
    matchMode: v.optional(searchModeValidator),
    excludeDefenseTeam: v.optional(v.array(searchSlotValidator)),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (
    ctx,
    {
      seasonNumber,
      defenseTeam,
      excludedStudentIds,
      matchMode = "primary",
      excludeDefenseTeam,
      paginationOpts,
    },
  ) => {
    if (!validSearchTeam(defenseTeam)) {
      throw new Error(
        "A defense search must contain six valid slots and at least one striker criterion.",
      );
    }

    const excluded = [...new Set(excludedStudentIds.filter(Boolean))];
    const similarMetadataComplete = hasCompleteSimilarityMetadata(defenseTeam);

    const concreteTeam = defenseTeam.map((slot) =>
      slot.studentId !== undefined ? { studentId: slot.studentId } : {},
    );

    const exact = matchMode === "primary" && isExactDefenseSearch(defenseTeam);
    const similarityIndexable = isSimilarityIndexableSearch(defenseTeam);

    const defenseTeamKey = exact ? getTeamKey(concreteTeam) : undefined;
    const defenseSpecialKey = getSpecialTeamKey(concreteTeam);
    const anchor = getSearchAnchor(defenseTeam);

    const similarityTraits = defenseTeam.slice(0, 4).map((slot) => ({
      range: slot.studentId ? (slot.range ?? 0) : 0,
      tank: slot.studentId ? slot.tank === true : false,
    }));

    let aggregateQuery: any;

    if (exact && defenseTeamKey) {
      aggregateQuery = ctx.db
        .query("pvpStatsAggregate")
        .withIndex("by_ranking", (q: any) =>
          q
            .eq("seasonNumber", seasonNumber)
            .eq("defenseTeamKey", defenseTeamKey),
        )
        .order("desc");
    } else if (matchMode === "similar" && similarityIndexable) {
      aggregateQuery = ctx.db
        .query("pvpStatsAggregate")
        .withIndex("by_similarity_ranking", (q: any) =>
          q
            .eq("seasonNumber", seasonNumber)
            .eq("defenseSpecialTeamKey", defenseSpecialKey)
            .eq("d1Range", similarityTraits[0].range)
            .eq("d1Tank", similarityTraits[0].tank)
            .eq("d2Range", similarityTraits[1].range)
            .eq("d2Tank", similarityTraits[1].tank)
            .eq("d3Range", similarityTraits[2].range)
            .eq("d3Tank", similarityTraits[2].tank)
            .eq("d4Range", similarityTraits[3].range)
            .eq("d4Tank", similarityTraits[3].tank),
        )
        .order("desc");
    } else {
      if (anchor) {
        const indexName = `by_d${anchor.index + 1}_${anchor.kind}_ranking`;

        const fieldName =
          anchor.kind === "student_id"
            ? `d${anchor.index + 1}StudentId`
            : `d${anchor.index + 1}${anchor.kind === "range" ? "Range" : "Tank"}`;

        const aggregateTable: any = ctx.db.query("pvpStatsAggregate");

        aggregateQuery = aggregateTable
          .withIndex(indexName, (q: any) =>
            q
              .eq("seasonNumber", seasonNumber)
              .eq("defenseSpecialTeamKey", defenseSpecialKey)
              .eq(fieldName, anchor.value),
          )
          .order("desc");
      } else {
        aggregateQuery = ctx.db
          .query("pvpStatsAggregate")
          .withIndex("by_special_ranking", (q: any) =>
            q
              .eq("seasonNumber", seasonNumber)
              .eq("defenseSpecialTeamKey", defenseSpecialKey),
          )
          .order("desc");
      }
    }

    // Exclusions can reject most of an indexed range. Bound the scan even
    // for exact searches so filtering cannot exceed transaction read limits.
    const rowsReadLimit = Math.min(paginationOpts.maximumRowsRead ?? 500, 500);

    // Filter before pagination so page size counts matching defenses, rather
    // than candidates that the client would have to discard and page past.
    aggregateQuery = aggregateQuery.filter((q: any) =>
      q.and(
        exact
          ? q.eq(q.field("defenseTeamKey"), defenseTeamKey)
          : q.and(
              q.eq(matchMode !== "similar" || similarMetadataComplete, true),
              getSearchTeamFilter(q, defenseTeam, matchMode === "similar"),
            ),
        matchMode === "similar" && excludeDefenseTeam
          ? q.not(getSearchTeamFilter(q, excludeDefenseTeam))
          : q.eq(true, true),
        ...excluded.flatMap((studentId) =>
          [
            "a1StudentId",
            "a2StudentId",
            "a3StudentId",
            "a4StudentId",
            "attackS1StudentId",
            "attackS2StudentId",
          ].map((field) => q.neq(q.field(field), studentId)),
        ),
      ),
    );

    const page = await aggregateQuery.paginate({
      ...paginationOpts,
      maximumRowsRead: rowsReadLimit,
    });

    return {
      ...page,
      page: page.page.map((item: Doc<"pvpStatsAggregate">) => ({
        attackTeam: getStoredTeam(item, "attack"),
        defenseTeam: getStoredTeam(item, "defense"),
        matchupId: `${item.defenseTeamKey}:${item.attackTeamKey}`,
        wins: item.wins,
        losses: item.total - item.wins,
        total: item.total,
        successRate: item.wins / item.total,
        confidenceScore: item.confidenceScore,
      })),
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
        traitsReady: true,
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

export const processRankingBatch = internalMutation({
  args: { refreshRunId: v.string(), cursor: v.optional(v.string()) },
  handler: async (ctx, { refreshRunId, cursor }) => {
    const status = await ctx.db
      .query("pvpStatsStatus")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();

    if (
      !status ||
      status.refreshRunId !== refreshRunId ||
      status.refreshPhase !== "rankings" ||
      status.rankingCursor !== cursor
    ) {
      return;
    }

    const page = await ctx.db
      .query("pvpStatsAggregate")
      .paginate({ numItems: 50, cursor: cursor ?? null });

    const totals = new Map<
      string,
      {
        seasonNumber: Doc<"pvpStatsAggregate">["seasonNumber"];
        role: "attack" | "defense";
        formationKey: string;
        team: Array<{ studentId?: string }>;
        wins: number;
        total: number;
      }
    >();

    for (const aggregate of page.page) {
      for (const role of ["attack", "defense"] as const) {
        const identity = rankingIdentity(getStoredTeam(aggregate, role));
        const key = `${aggregate.seasonNumber}:${role}:${identity.formationKey}`;

        const wins =
          role === "attack" ? aggregate.wins : aggregate.total - aggregate.wins;
        const previous = totals.get(key);

        totals.set(key, {
          ...identity,
          seasonNumber: aggregate.seasonNumber,
          role,
          wins: (previous?.wins ?? 0) + wins,
          total: (previous?.total ?? 0) + aggregate.total,
        });
      }
    }

    for (const value of totals.values()) {
      const existing = await ctx.db
        .query("pvpStatsFormation")
        .withIndex("by_identity", (q) =>
          q
            .eq("snapshot", refreshRunId)
            .eq("seasonNumber", value.seasonNumber)
            .eq("role", value.role)
            .eq("formationKey", value.formationKey),
        )
        .unique();

      const wins = (existing?.wins ?? 0) + value.wins;
      const total = (existing?.total ?? 0) + value.total;
      const interval = wilsonInterval(wins, total);

      const next = {
        ...value,
        snapshot: refreshRunId,
        wins,
        total,
        s1StudentId: value.team[0]?.studentId,
        s2StudentId: value.team[1]?.studentId,
        s3StudentId: value.team[2]?.studentId,
        s4StudentId: value.team[3]?.studentId,
        s5StudentId: value.team[4]?.studentId,
        s6StudentId: value.team[5]?.studentId,
        successRate: total > 0 ? wins / total : 0,
        confidenceScore: interval.lower,
        confidenceUpper: interval.upper,
      };

      if (existing) {
        await ctx.db.patch(existing._id, next);
      } else {
        await ctx.db.insert("pvpStatsFormation", next);
      }
    }

    if (!page.isDone) {
      await ctx.db.patch(status._id, {
        rankingCursor: page.continueCursor,
        refreshHeartbeatAt: Date.now(),
      });

      await ctx.scheduler.runAfter(0, internal.pvpStats.processRankingBatch, {
        refreshRunId,
        cursor: page.continueCursor,
      });

      return;
    }

    await ctx.db.patch(status._id, {
      rankingsSnapshot: refreshRunId,
      rankingCursor: undefined,
      refreshPhase: undefined,
      isUpdating: false,
      lastCompletedAt: Date.now(),
      refreshHeartbeatAt: Date.now(),
    });

    await ctx.scheduler.runAfter(
      0,
      internal.pvpStats.cleanupRankingSnapshots,
      {},
    );
  },
});

export const cleanupRankingSnapshots = internalMutation({
  args: {},
  handler: async (ctx) => {
    const status = await ctx.db
      .query("pvpStatsStatus")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();

    const publishedSnapshot = status?.rankingsSnapshot;
    if (!publishedSnapshot) {
      return;
    }

    const oldest = await ctx.db
      .query("pvpStatsFormation")
      .withIndex("by_snapshot", (q) => q.lt("snapshot", publishedSnapshot))
      .first();

    if (!oldest || oldest.snapshot === status.refreshRunId) {
      return;
    }

    const rows = await ctx.db
      .query("pvpStatsFormation")
      .withIndex("by_snapshot", (q) => q.eq("snapshot", oldest.snapshot))
      .take(100);

    for (const row of rows) {
      await ctx.db.delete(row._id);
    }

    await ctx.scheduler.runAfter(
      0,
      internal.pvpStats.cleanupRankingSnapshots,
      {},
    );
  },
});

export const getRankingsSnapshot = query({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    const status = await ctx.db
      .query("pvpStatsStatus")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();

    return status?.rankingsSnapshot ?? null;
  },
});

export const listEffectiveTeams = query({
  args: {
    snapshot: v.string(),
    seasonNumber: seasonNumberValidator,
    role: v.union(v.literal("attack"), v.literal("defense")),
    excludedStudentIds: v.array(v.string()),
    minimumBattles: v.number(),
    sort: v.union(
      v.literal("confidence"),
      v.literal("winRateDesc"),
      v.literal("winRateAsc"),
      v.literal("battles"),
    ),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    if (!Number.isSafeInteger(args.minimumBattles) || args.minimumBattles < 1) {
      throw new Error("Minimum battles must be a positive integer.");
    }

    const status = await ctx.db
      .query("pvpStatsStatus")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();

    if (args.snapshot !== status?.rankingsSnapshot) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const index =
      args.sort === "confidence"
        ? "by_confidence"
        : args.sort === "battles"
          ? "by_total"
          : "by_rate";

    const excluded = [...new Set(args.excludedStudentIds.filter(Boolean))];

    const page = await ctx.db
      .query("pvpStatsFormation")
      .withIndex(index, (q) =>
        q
          .eq("snapshot", args.snapshot)
          .eq("seasonNumber", args.seasonNumber)
          .eq("role", args.role),
      )
      .order(args.sort === "winRateAsc" ? "asc" : "desc")
      .filter((q) =>
        q.and(
          q.gte(q.field("total"), args.minimumBattles),
          ...excluded.map((id) =>
            q.not(
              q.or(
                ...(
                  [
                    "s1StudentId",
                    "s2StudentId",
                    "s3StudentId",
                    "s4StudentId",
                    "s5StudentId",
                    "s6StudentId",
                  ] as const
                ).map((field) => q.eq(q.field(field), id)),
              ),
            ),
          ),
        ),
      )
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(args.paginationOpts.numItems, 20),
        maximumRowsRead: Math.min(
          args.paginationOpts.maximumRowsRead ?? 500,
          500,
        ),
      });

    return {
      ...page,
      page: page.page.map((team) => ({
        formationKey: team.formationKey,
        team: team.team,
        wins: team.wins,
        losses: team.total - team.wins,
        total: team.total,
        successRate: team.successRate,
        confidenceScore: team.confidenceScore,
        confidenceUpper: team.confidenceUpper,
      })),
    };
  },
});
