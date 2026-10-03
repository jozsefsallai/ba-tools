import { PVP_COUNTER_RANGES, PVP_SEASONS } from "@/lib/types";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { type Infer, v } from "convex/values";
import { internal } from "~convex/api";
import type { Doc } from "~convex/dataModel";
import { internalAction, internalMutation, query } from "~convex/server";
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

function matchesSearchTeam(
  team: SearchSlot[],
  item: any,
  matcher: (slot: SearchSlot, index: number, item: any) => boolean,
) {
  return team.every((slot, index) => matcher(slot, index, item));
}

function hasNoExcludedStudents(team: Team, excluded: Set<string>) {
  return team.every(
    (student) => !student.studentId || !excluded.has(student.studentId),
  );
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

  return [
    { studentId: item[`${prefix}1StudentId`] },
    { studentId: item[`${prefix}2StudentId`] },
    { studentId: item[`${prefix}3StudentId`] },
    { studentId: item[`${prefix}4StudentId`] },
    { studentId: item[`${specialPrefix}S1StudentId`] },
    { studentId: item[`${specialPrefix}S2StudentId`] },
  ];
}

const defenseTraitFields = [
  { studentId: "d1StudentId", range: "d1Range", tank: "d1Tank" },
  { studentId: "d2StudentId", range: "d2Range", tank: "d2Tank" },
  { studentId: "d3StudentId", range: "d3Range", tank: "d3Tank" },
  { studentId: "d4StudentId", range: "d4Range", tank: "d4Tank" },
] as const;

function getStoredDefenseTraits(item: any, index: number) {
  const fields = defenseTraitFields[index];

  return {
    studentId: fields ? item[fields.studentId] : undefined,
    range: fields ? item[fields.range] : undefined,
    tank: fields ? item[fields.tank] : undefined,
  };
}

function getStoredDefenseStudentId(item: any, index: number) {
  if (index < 4) {
    return getStoredDefenseTraits(item, index).studentId;
  }

  return item[index === 4 ? "defenseS1StudentId" : "defenseS2StudentId"];
}

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

function matchesSlot(slot: SearchSlot, index: number, item: any) {
  if (index >= 4) {
    return (
      ("studentId" in slot ? slot.studentId : undefined) ===
      getStoredDefenseStudentId(item, index)
    );
  }

  const stored = getStoredDefenseTraits(item, index);
  const studentId = stored.studentId;

  if (slot.studentId) {
    return slot.studentId === studentId;
  }

  if (slot.range !== undefined) {
    return stored.range === slot.range;
  }

  if (slot.tank === true) {
    return stored.tank === true;
  }

  return !studentId;
}

function matchesSimilarSlot(slot: SearchSlot, index: number, item: any) {
  if (index < 4 && slot.studentId) {
    if (!slot.range || typeof slot.tank !== "boolean") {
      return false;
    }

    const stored = getStoredDefenseTraits(item, index);
    return stored.range === slot.range && stored.tank === slot.tank;
  }

  return matchesSlot(slot, index, item);
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
    const value = {
      key: "global" as const,
      isUpdating: true,
      nextExpectedAt: now + 6 * 60 * 60 * 1000,
      traitsReady: false,
    };

    if (existing) {
      await ctx.db.patch(existing._id, value);
    } else {
      await ctx.db.insert("pvpStatsStatus", value);
    }

    await ctx.scheduler.runAfter(0, internal.pvpStats.processStats, {});
  },
});

export const processStatsBatch = internalMutation({
  args: {
    students: v.array(studentMetadataValidator),
    aggregateCursor: v.optional(v.string()),
  },
  handler: async (ctx, { students, aggregateCursor }) => {
    const metadata = new Map(
      students.map((student) => [student.studentId, student]),
    );

    const status = await ctx.db
      .query("pvpStatsStatus")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();

    let nextAggregateCursor = aggregateCursor;
    let aggregateHasMore = false;

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

      aggregateHasMore = !page.isDone;
      nextAggregateCursor = page.isDone ? undefined : page.continueCursor;

      if (page.isDone && status) {
        await ctx.db.patch(status._id, {
          traitsReady: true,
          traitsUpdatedAt: Date.now(),
        });
      }
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
      pending.length === 100 ||
      rebuildHasMore ||
      Boolean(anotherRebuild) ||
      aggregateHasMore;

    if (hasMore) {
      console.info("[pvpStats] batch has more work", {
        processed: pending.length,
        pendingBacklogAtLeast: pending.length === 100 ? 100 : 0,
        rebuildHasMore,
        anotherRebuild: Boolean(anotherRebuild),
      });

      return { hasMore: true, aggregateCursor: nextAggregateCursor };
    }

    if (status) {
      const update: Record<string, unknown> = {
        isUpdating: false,
        lastCompletedAt: Date.now(),
      };

      if (students.length > 0) {
        update.traitsReady = true;
        update.traitsUpdatedAt = Date.now();
      }

      await ctx.db.patch(status._id, update);

      console.info("[pvpStats] refresh completed", {
        remainingBacklog: 0,
      });
    }

    return { hasMore: false, aggregateCursor: undefined };
  },
});

export const processStats = internalAction({
  args: {
    students: v.optional(v.array(studentMetadataValidator)),
    aggregateCursor: v.optional(v.string()),
  },
  handler: async (ctx, { students: providedStudents, aggregateCursor }) => {
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
    });

    if (result.hasMore) {
      await ctx.scheduler.runAfter(0, internal.pvpStats.processStats, {
        students,
        aggregateCursor: result.aggregateCursor,
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

    const excluded = new Set(excludedStudentIds);
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

    const filteredPage = [];
    let cursor = paginationOpts.cursor;
    let isDone = false;
    let continueCursor = cursor ?? "";
    const rowsReadLimit =
      exact || (matchMode === "similar" && similarityIndexable)
        ? undefined
        : 500;

    let rowsRead = 0;

    while (filteredPage.length === 0 && !isDone) {
      const remainingRows = rowsReadLimit
        ? rowsReadLimit - rowsRead
        : undefined;

      if (remainingRows !== undefined && remainingRows <= 0) {
        break;
      }

      const page = await aggregateQuery.paginate({
        numItems: paginationOpts.numItems,
        cursor,
        ...(remainingRows !== undefined
          ? { maximumRowsRead: remainingRows }
          : {}),
      });

      continueCursor = page.continueCursor;
      isDone = page.isDone;
      rowsRead += page.page.length;

      for (const item of page.page) {
        const criteriaMatch = exact
          ? item.defenseTeamKey === defenseTeamKey
          : (matchMode === "similar" ? similarMetadataComplete : true) &&
            matchesSearchTeam(
              defenseTeam,
              item,
              matchMode === "similar" ? matchesSimilarSlot : matchesSlot,
            );

        const primaryMatch =
          matchMode === "similar" && excludeDefenseTeam
            ? matchesSearchTeam(excludeDefenseTeam, item, matchesSlot)
            : false;

        if (!criteriaMatch || primaryMatch) {
          continue;
        }

        const attackTeam = getStoredTeam(item, "attack");
        if (hasNoExcludedStudents(attackTeam, excluded)) {
          const storedDefenseTeam = getStoredTeam(item, "defense");
          filteredPage.push({
            attackTeam,
            defenseTeam: storedDefenseTeam,
            matchupId: `${item.defenseTeamKey}:${item.attackTeamKey}`,
            wins: item.wins,
            losses: item.total - item.wins,
            total: item.total,
            successRate: item.wins / item.total,
            confidenceScore: item.confidenceScore,
          });
        }
      }

      cursor = page.continueCursor;
      if (rowsReadLimit && rowsRead >= rowsReadLimit) break;
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
