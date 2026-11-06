import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { convexToZodShape } from "@/lib/mcp/convex-to-zod";
import { defineTool } from "@/lib/mcp/define-tool";
import { userPreferencesDocs } from "@/lib/mcp/field-docs";
import {
  getMe,
  getPreferences,
  updatePreferences,
} from "@/lib/public-api/resources/account.server";
import { userPreferencesArgs } from "~convex-lib/validators";

export function registerAccountTools(server: McpServer) {
  defineTool(
    server,
    "get_me",
    {
      title: "Get my account",
      description: "The signed-in user's profile.",
      kind: "read",
    },
    (_input, userId) => getMe(userId),
  );

  defineTool(
    server,
    "get_preferences",
    {
      title: "Get my preferences",
      description:
        "The signed-in user's default settings for the timeline visualizer, formation display, bond calculator, and PvP tracker.",
      kind: "read",
    },
    (_input, userId) => getPreferences(userId),
  );

  defineTool(
    server,
    "update_preferences",
    {
      title: "Update my preferences",
      description: "Change preferences. Only the fields sent change.",
      kind: "update",
      input: convexToZodShape(userPreferencesArgs, userPreferencesDocs),
    },
    (input, userId) => updatePreferences(userId, input),
  );
}
