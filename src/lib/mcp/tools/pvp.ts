import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { convexToZodShape } from "@/lib/mcp/convex-to-zod";
import {
  defineTool,
  idInput,
  paginationInput,
  paginationOpts,
} from "@/lib/mcp/define-tool";
import {
  createPvpEnemyPreset,
  createPvpEnemyTeam,
  createPvpFormationPreset,
  createPvpMatch,
  createPvpSeason,
  deletePvpEnemyPreset,
  deletePvpEnemyTeam,
  deletePvpFormationPreset,
  deletePvpMatch,
  deletePvpSeason,
  getPvpEnemyPreset,
  getPvpEnemyTeam,
  getPvpFormationPreset,
  getPvpMatch,
  getPvpSeason,
  listPvpEnemyPresets,
  listPvpEnemyPresetTeams,
  listPvpFormationPresets,
  listPvpMatches,
  listPvpSeasons,
  updatePvpEnemyPreset,
  updatePvpEnemyTeam,
  updatePvpFormationPreset,
  updatePvpMatch,
  updatePvpSeason,
} from "@/lib/public-api/resources/pvp.server";
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
} from "~convex-lib/validators";

const seasonFields = convexToZodShape(pvpSeasonArgs);
const seasonId = idInput("PvP season id from `list_pvp_seasons`.");
const matchId = idInput("Match id.");
const presetId = idInput("Preset id.");
const teamId = idInput("Enemy team id.");
const search = z.string().optional().describe("Filter by name.");

function registerSeasonTools(server: McpServer) {
  defineTool(
    server,
    "list_pvp_seasons",
    {
      title: "List my PvP seasons",
      description:
        "The user's tracked PvP (Tactical Challenge) seasons. Matches, presets, and enemy teams all belong to a season.",
      kind: "read",
    },
    (_input, userId) => listPvpSeasons(userId),
  );

  defineTool(
    server,
    "get_pvp_season",
    {
      title: "Get PvP season",
      description: "One tracked PvP season.",
      kind: "read",
      input: {
        seasonId,
      },
    },
    ({ seasonId }, userId) => getPvpSeason(userId, seasonId),
  );

  defineTool(
    server,
    "create_pvp_season",
    {
      title: "Create PvP season",
      description: "Start tracking a PvP season on a game server.",
      kind: "create",
      input: seasonFields,
    },
    (input, userId) => createPvpSeason(userId, input),
  );

  defineTool(
    server,
    "update_pvp_season",
    {
      title: "Update PvP season",
      description:
        "Change a PvP season, or archive it with `archived`. Only the fields sent change.",
      kind: "update",
      input: {
        seasonId,
        ...z.object(seasonFields).partial().shape,
        archived: z.boolean().optional(),
      },
    },
    ({ seasonId, ...patch }, userId) =>
      updatePvpSeason(userId, seasonId, patch),
  );

  defineTool(
    server,
    "delete_pvp_season",
    {
      title: "Delete PvP season",
      description:
        "Permanently delete a PvP season with all of its matches, presets, and enemy teams.",
      kind: "delete",
      input: {
        seasonId,
      },
    },
    ({ seasonId }, userId) => deletePvpSeason(userId, seasonId),
  );
}

function registerMatchTools(server: McpServer) {
  defineTool(
    server,
    "list_pvp_matches",
    {
      title: "List PvP matches",
      description:
        "The matches recorded in a season. `from` and `to` (Unix ms) narrow it to a date range.",
      kind: "read",
      input: {
        seasonId,
        from: z.number().int().optional(),
        to: z.number().int().optional(),
      },
    },
    ({ seasonId, ...range }, userId) => listPvpMatches(userId, seasonId, range),
  );

  defineTool(
    server,
    "get_pvp_match",
    {
      title: "Get PvP match",
      description: "One recorded match.",
      kind: "read",
      input: {
        seasonId,
        matchId,
      },
    },
    ({ seasonId, matchId }, userId) => getPvpMatch(userId, seasonId, matchId),
  );

  defineTool(
    server,
    "create_pvp_match",
    {
      title: "Record PvP match",
      description:
        "Record a match. `date` is Unix ms. `ownTeam` and `opponentTeam` hold six slots in order (four strikers, then two specials); student ids come from `search_students`. `autoCreateEnemyPreset` files the opponent under a new enemy preset.",
      kind: "create",
      input: {
        seasonId,
        ...convexToZodShape(pvpMatchCreateArgs),
      },
    },
    ({ seasonId, ...input }, userId) => createPvpMatch(userId, seasonId, input),
  );

  defineTool(
    server,
    "update_pvp_match",
    {
      title: "Update PvP match",
      description:
        "Change a recorded match. Only the fields sent change; teams sent replace the whole team.",
      kind: "update",
      input: {
        seasonId,
        matchId,
        ...convexToZodShape(pvpMatchUpdateArgs),
      },
    },
    ({ seasonId, matchId, ...patch }, userId) =>
      updatePvpMatch(userId, seasonId, matchId, patch),
  );

  defineTool(
    server,
    "delete_pvp_match",
    {
      title: "Delete PvP match",
      description: "Permanently delete a recorded match.",
      kind: "delete",
      input: {
        seasonId,
        matchId,
      },
    },
    ({ seasonId, matchId }, userId) =>
      deletePvpMatch(userId, seasonId, matchId),
  );
}

function registerFormationPresetTools(server: McpServer) {
  defineTool(
    server,
    "list_pvp_formation_presets",
    {
      title: "List PvP formation presets",
      description: "The user's saved teams in a season.",
      kind: "read",
      input: {
        seasonId,
        search,
      },
    },
    ({ seasonId, search }, userId) =>
      listPvpFormationPresets(userId, seasonId, {
        search,
      }),
  );

  defineTool(
    server,
    "get_pvp_formation_preset",
    {
      title: "Get PvP formation preset",
      description: "One saved team.",
      kind: "read",
      input: {
        seasonId,
        presetId,
      },
    },
    ({ seasonId, presetId }, userId) =>
      getPvpFormationPreset(userId, seasonId, presetId),
  );

  defineTool(
    server,
    "create_pvp_formation_preset",
    {
      title: "Create PvP formation preset",
      description:
        "Save one of the user's teams for attack, defense, or both. `team` holds six slots in order (four strikers, then two specials).",
      kind: "create",
      input: {
        seasonId,
        ...convexToZodShape(pvpFormationPresetCreateArgs),
      },
    },
    ({ seasonId, ...input }, userId) =>
      createPvpFormationPreset(userId, seasonId, input),
  );

  defineTool(
    server,
    "update_pvp_formation_preset",
    {
      title: "Update PvP formation preset",
      description: "Change a saved team. Only the fields sent change.",
      kind: "update",
      input: {
        seasonId,
        presetId,
        ...convexToZodShape(pvpFormationPresetUpdateArgs),
      },
    },
    ({ seasonId, presetId, ...patch }, userId) =>
      updatePvpFormationPreset(userId, seasonId, presetId, patch),
  );

  defineTool(
    server,
    "delete_pvp_formation_preset",
    {
      title: "Delete PvP formation preset",
      description: "Permanently delete a saved team.",
      kind: "delete",
      input: {
        seasonId,
        presetId,
      },
    },
    ({ seasonId, presetId }, userId) =>
      deletePvpFormationPreset(userId, seasonId, presetId),
  );
}

function registerEnemyTools(server: McpServer) {
  defineTool(
    server,
    "list_pvp_enemy_presets",
    {
      title: "List PvP enemy presets",
      description:
        "Opponents the user tracks in a season, each grouping that opponent's teams. Paginated.",
      kind: "read",
      input: {
        seasonId,
        search,
        ...paginationInput,
      },
    },
    ({ seasonId, search, ...page }, userId) =>
      listPvpEnemyPresets(
        userId,
        seasonId,
        {
          search,
        },
        paginationOpts(page),
      ),
  );

  defineTool(
    server,
    "get_pvp_enemy_preset",
    {
      title: "Get PvP enemy preset",
      description: "One tracked opponent.",
      kind: "read",
      input: {
        seasonId,
        presetId,
      },
    },
    ({ seasonId, presetId }, userId) =>
      getPvpEnemyPreset(userId, seasonId, presetId),
  );

  defineTool(
    server,
    "list_pvp_enemy_preset_teams",
    {
      title: "List PvP enemy preset teams",
      description: "The teams recorded for a tracked opponent.",
      kind: "read",
      input: {
        seasonId,
        presetId,
      },
    },
    ({ seasonId, presetId }, userId) =>
      listPvpEnemyPresetTeams(userId, seasonId, presetId),
  );

  defineTool(
    server,
    "create_pvp_enemy_preset",
    {
      title: "Create PvP enemy preset",
      description: "Start tracking an opponent in a season.",
      kind: "create",
      input: {
        seasonId,
        ...convexToZodShape(pvpEnemyPresetCreateArgs),
      },
    },
    ({ seasonId, ...input }, userId) =>
      createPvpEnemyPreset(userId, seasonId, input),
  );

  defineTool(
    server,
    "update_pvp_enemy_preset",
    {
      title: "Update PvP enemy preset",
      description: "Change a tracked opponent. Only the fields sent change.",
      kind: "update",
      input: {
        seasonId,
        presetId,
        ...convexToZodShape(pvpEnemyPresetUpdateArgs),
      },
    },
    ({ seasonId, presetId, ...patch }, userId) =>
      updatePvpEnemyPreset(userId, seasonId, presetId, patch),
  );

  defineTool(
    server,
    "delete_pvp_enemy_preset",
    {
      title: "Delete PvP enemy preset",
      description: "Permanently delete a tracked opponent.",
      kind: "delete",
      input: {
        seasonId,
        presetId,
      },
    },
    ({ seasonId, presetId }, userId) =>
      deletePvpEnemyPreset(userId, seasonId, presetId),
  );

  defineTool(
    server,
    "get_pvp_enemy_team",
    {
      title: "Get PvP enemy team",
      description: "One recorded enemy team.",
      kind: "read",
      input: {
        seasonId,
        teamId,
      },
    },
    ({ seasonId, teamId }, userId) => getPvpEnemyTeam(userId, seasonId, teamId),
  );

  defineTool(
    server,
    "create_pvp_enemy_team",
    {
      title: "Create PvP enemy team",
      description:
        "Record a team an opponent used, optionally under an enemy preset. `team` holds six slots in order (four strikers, then two specials).",
      kind: "create",
      input: {
        seasonId,
        ...convexToZodShape(pvpEnemyTeamCreateArgs),
      },
    },
    ({ seasonId, ...input }, userId) =>
      createPvpEnemyTeam(userId, seasonId, input),
  );

  defineTool(
    server,
    "update_pvp_enemy_team",
    {
      title: "Update PvP enemy team",
      description:
        "Change a recorded enemy team. Only the fields sent change. The id can change if the team merges with an identical one.",
      kind: "update",
      input: {
        seasonId,
        teamId,
        ...convexToZodShape(pvpEnemyTeamUpdateArgs),
      },
    },
    ({ seasonId, teamId, ...patch }, userId) =>
      updatePvpEnemyTeam(userId, seasonId, teamId, patch),
  );

  defineTool(
    server,
    "delete_pvp_enemy_team",
    {
      title: "Delete PvP enemy team",
      description: "Permanently delete a recorded enemy team.",
      kind: "delete",
      input: {
        seasonId,
        teamId,
      },
    },
    ({ seasonId, teamId }, userId) =>
      deletePvpEnemyTeam(userId, seasonId, teamId),
  );
}

export function registerPvpTools(server: McpServer) {
  registerSeasonTools(server);
  registerMatchTools(server);
  registerFormationPresetTools(server);
  registerEnemyTools(server);
}
