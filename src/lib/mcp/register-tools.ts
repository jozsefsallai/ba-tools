import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAccountTools } from "@/lib/mcp/tools/account";
import { registerFormationTools } from "@/lib/mcp/tools/formations";
import { registerGameDataTools } from "@/lib/mcp/tools/game-data";
import { registerGiftInventoryTools } from "@/lib/mcp/tools/gift-inventories";
import { registerPvpTools } from "@/lib/mcp/tools/pvp";
import { registerPvpStatsTools } from "@/lib/mcp/tools/pvp-stats";
import { registerRecruitmentTools } from "@/lib/mcp/tools/recruitment";
import { registerRosterTools } from "@/lib/mcp/tools/rosters";
import { registerSharedContentTools } from "@/lib/mcp/tools/shared-content";
import { registerTimelineGroupTools } from "@/lib/mcp/tools/timeline-groups";
import { registerTimelineTools } from "@/lib/mcp/tools/timelines";

export function registerMcpTools(server: McpServer) {
  registerGameDataTools(server);
  registerSharedContentTools(server);
  registerPvpStatsTools(server);
  registerAccountTools(server);
  registerFormationTools(server);
  registerTimelineTools(server);
  registerTimelineGroupTools(server);
  registerRosterTools(server);
  registerGiftInventoryTools(server);
  registerPvpTools(server);
  registerRecruitmentTools(server);
}
