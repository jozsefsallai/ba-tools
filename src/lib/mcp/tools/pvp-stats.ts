import {
  defineTool,
  paginationInput,
  paginationOpts,
} from "@/lib/mcp/define-tool";
import {
  getPvpStatsStatus,
  getPvpStatsSummary,
  listPvpTeams,
  pvpStatsSearchSchema,
  pvpStatsSummarySchema,
  pvpTeamsSchema,
  searchPvpStats,
} from "@/lib/public-api/resources/pvp-stats.server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerPvpStatsTools(server: McpServer) {
  defineTool(
    server,
    "get_pvp_stats_status",
    {
      title: "Get PvP stats status",
      description:
        "Whether the community PvP (Tactical Challenge) statistics are being rebuilt, and when they were last and will next be updated.",
      kind: "read",
    },
    () => getPvpStatsStatus(),
  );

  defineTool(
    server,
    "get_pvp_stats_summary",
    {
      title: "Get PvP stats summary",
      description:
        "Overview of a PvP season's community statistics: battle counts and the most used and most successful students.",
      kind: "read",
      input: pvpStatsSummarySchema.shape,
    },
    (input) => getPvpStatsSummary(input),
  );

  defineTool(
    server,
    "list_pvp_teams",
    {
      title: "List PvP teams",
      description:
        "Ranked attack or defense teams for a PvP season, from community match records. Paginated.",
      kind: "read",
      input: { ...pvpTeamsSchema.shape, ...paginationInput },
    },
    ({ limit, cursor, ...input }) =>
      listPvpTeams(input, paginationOpts({ limit, cursor })),
  );

  defineTool(
    server,
    "search_pvp_stats",
    {
      title: "Search PvP counters",
      description:
        "Find attack teams that beat a given defense team in a PvP season. Each `defenseTeam` slot takes a `studentId`, and optionally a `range` or `tank` flag to match by role instead. Paginated.",
      kind: "read",
      rateLimit: "search",
      input: { ...pvpStatsSearchSchema.shape, ...paginationInput },
    },
    ({ limit, cursor, ...input }) =>
      searchPvpStats(input, paginationOpts({ limit, cursor })),
  );
}
