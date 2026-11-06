import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { defineTool, idInput } from "@/lib/mcp/define-tool";
import { GAME_SERVER_DOC } from "@/lib/mcp/field-docs";
import {
  getPublicRoster,
  getPublicTimeline,
  getPublicTimelineGroup,
} from "@/lib/public-api/resources/shared-content.server";
import { GAME_SERVERS } from "@/lib/types";

export function registerSharedContentTools(server: McpServer) {
  defineTool(
    server,
    "get_public_roster",
    {
      title: "Get public roster",
      description:
        "Another player's public student roster, looked up by game server and friend code.",
      kind: "read",
      input: {
        gameServer: z.enum(GAME_SERVERS).describe(GAME_SERVER_DOC),
        friendCode: z
          .string()
          .describe("The player's 8-letter friend code (A-Z)."),
      },
    },
    ({ gameServer, friendCode }) => getPublicRoster(gameServer, friendCode),
  );

  defineTool(
    server,
    "get_public_timeline",
    {
      title: "Get public timeline",
      description: "A timeline (skill rotation) that its owner made public.",
      kind: "read",
      input: {
        timelineId: idInput("Timeline id."),
      },
    },
    ({ timelineId }) => getPublicTimeline(timelineId),
  );

  defineTool(
    server,
    "get_public_timeline_group",
    {
      title: "Get public timeline group",
      description: "A group of timelines that its owner made public.",
      kind: "read",
      input: {
        timelineGroupId: idInput("Timeline group id."),
      },
    },
    ({ timelineGroupId }) => getPublicTimelineGroup(timelineGroupId),
  );
}
