import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
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
