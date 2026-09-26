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

export const runPvpTeamKeyBackfill = migrations.runner([
  internal.migrations.backfillPvpFormationPresetTeamKeys,
  internal.migrations.backfillPvpEnemyTeamKeys,
  internal.migrations.backfillPvpMatchTeamKeys,
]);
