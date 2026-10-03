import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "~convex/api";
import type { DataModel } from "~convex/dataModel";
import { getPvpVideoUrl } from "./lib/pvpVideo";
import { getTeamKey } from "./lib/teamKey";
import schema from "./schema";

export const migrations = new Migrations<DataModel, typeof schema>(
  components.migrations,
  {
    schema,
  },
);

export const backfillPvpFormationPresetTeamKeys = migrations.define({
  table: "pvpFormationPreset",
  migrateOne: async (_ctx, preset) => ({
    teamKey: preset.teamKey ?? getTeamKey(preset.team),
  }),
});

export const backfillPvpEnemyTeamKeys = migrations.define({
  table: "pvpEnemyTeam",
  migrateOne: async (_ctx, team) => ({
    teamKey: team.teamKey ?? getTeamKey(team.team),
  }),
});

export const backfillPvpMatchTeamKeys = migrations.define({
  table: "pvpMatchRecord",
  migrateOne: async (_ctx, match) => ({
    ownTeamKey: match.ownTeamKey ?? getTeamKey(match.ownTeam),
    opponentTeamKey: match.opponentTeamKey ?? getTeamKey(match.opponentTeam),
  }),
});

export const backfillPvpEnemyPresetRecency = migrations.define({
  table: "pvpEnemyPreset",
  migrateOne: async (ctx, preset) => {
    const matches = await ctx.db
      .query("pvpMatchRecord")
      .withIndex("by_enemyPresetId_date", (q) =>
        q.eq("enemyPresetId", preset._id),
      )
      .collect();

    const lastRecordedAt = matches.reduce<number | undefined>(
      (latest, match) =>
        latest === undefined || match._creationTime > latest
          ? match._creationTime
          : latest,
      undefined,
    );

    return { lastRecordedAt };
  },
});

export const runPvpTeamKeyBackfill = migrations.runner([
  internal.migrations.backfillPvpFormationPresetTeamKeys,
  internal.migrations.backfillPvpEnemyTeamKeys,
  internal.migrations.backfillPvpMatchTeamKeys,
  internal.migrations.backfillPvpEnemyPresetRecency,
]);

export const backfillPvpStatsVideos = migrations.define({
  table: "pvpStatsContribution",
  migrateOne: async (ctx, contribution) => {
    const match = await ctx.db.get(contribution.matchId);
    return {
      videoUrl: getPvpVideoUrl(match?.videoUrl),
    };
  },
});

export const runPvpVideoBackfill = migrations.runner([
  internal.migrations.backfillPvpStatsVideos,
]);

const legacyPvpAggregateTraitFields = ["attackTeam", "defenseTeam"] as const;

export const compactPvpStatsAggregateTraits = migrations.define({
  table: "pvpStatsAggregate",
  migrateOne: async (ctx, doc) => {
    const source = doc as Record<string, unknown>;
    const next = { ...source };

    let changed = false;

    const attackTeam = Array.isArray(source.attackTeam)
      ? source.attackTeam
      : [];
    const defenseTeam = Array.isArray(source.defenseTeam)
      ? source.defenseTeam
      : [];

    const setSideFields = (team: unknown[], side: "attack" | "defense") => {
      const prefix = side === "attack" ? "a" : "d";
      const specialPrefix = side === "attack" ? "attack" : "defense";

      for (let index = 0; index < 4; index += 1) {
        const position = index + 1;
        const teamStudentId = (
          team[index] as { studentId?: unknown } | undefined
        )?.studentId;

        const studentId =
          source[`${prefix}${position}StudentId`] ??
          (typeof teamStudentId === "string" ? teamStudentId : undefined);

        if (
          studentId !== undefined &&
          source[`${prefix}${position}StudentId`] === undefined
        ) {
          next[`${prefix}${position}StudentId`] = studentId;
          changed = true;
        }
      }

      for (const [offset, field] of [
        [4, `${specialPrefix}S1StudentId`],
        [5, `${specialPrefix}S2StudentId`],
      ] as const) {
        const studentId = (team[offset] as { studentId?: unknown } | undefined)
          ?.studentId;

        if (typeof studentId === "string" && source[field] === undefined) {
          next[field] = studentId;
          changed = true;
        }
      }

      const specialKeyField = `${specialPrefix}SpecialTeamKey`;

      if (source[specialKeyField] === undefined && team.length >= 6) {
        next[specialKeyField] = getTeamKey(
          team.slice(4) as Array<{ studentId?: string }>,
        );

        changed = true;
      }
    };

    setSideFields(attackTeam, "attack");
    setSideFields(defenseTeam, "defense");

    for (const field of legacyPvpAggregateTraitFields) {
      if (field in source) {
        changed = true;
        delete next[field];
      }
    }

    if (changed) {
      const compact = Object.fromEntries(
        Object.entries(next).filter(
          ([field]) => field !== "_id" && field !== "_creationTime",
        ),
      );

      await ctx.db.replace(doc._id, compact as any);
    }
  },
});

export const runPvpStatsAggregateTraitCompaction = migrations.runner([
  internal.migrations.compactPvpStatsAggregateTraits,
]);
