import { registerGetStudentTool } from "@/lib/mcp/tools/get-student";
import { registerListBannersTool } from "@/lib/mcp/tools/list-banners";
import { registerSearchGiftsTool } from "@/lib/mcp/tools/search-gifts";
import { registerSearchStudentsTool } from "@/lib/mcp/tools/search-students";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerMcpTools(server: McpServer) {
  registerSearchStudentsTool(server);
  registerGetStudentTool(server);
  registerListBannersTool(server);
  registerSearchGiftsTool(server);
}
