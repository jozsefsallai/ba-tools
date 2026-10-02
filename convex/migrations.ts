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
