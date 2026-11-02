import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { convexToZodShape } from "@/lib/mcp/convex-to-zod";
import {
  defineTool,
  idInput,
  paginationInput,
  paginationOpts,
} from "@/lib/mcp/define-tool";
import {
  createTimelineGroup,
  deleteTimelineGroup,
  getTimelineGroup,
  listTimelineGroups,
  updateTimelineGroup,
} from "@/lib/public-api/resources/timeline-groups.server";
import {
  timelineGroupCreateArgs,
  timelineGroupUpdateArgs,
} from "~convex-lib/validators";

const timelineGroupId = idInput("Timeline group id.");

export function registerTimelineGroupTools(server: McpServer) {
  defineTool(
    server,
    "list_timeline_groups",
    {
      title: "List my timeline groups",
      description: "The user's timeline groups, newest first. Paginated.",
      kind: "read",
      input: paginationInput,
    },
    (input, userId) => listTimelineGroups(userId, paginationOpts(input)),
  );

  defineTool(
    server,
    "get_timeline_group",
    {
      title: "Get timeline group",
      description: "One of the user's timeline groups, with its timelines.",
      kind: "read",
      input: {
        timelineGroupId,
      },
    },
    ({ timelineGroupId }, userId) => getTimelineGroup(userId, timelineGroupId),
  );

  defineTool(
    server,
    "create_timeline_group",
    {
      title: "Create timeline group",
      description:
        "Create an empty timeline group. Add timelines with `update_timeline_group`.",
      kind: "create",
      input: convexToZodShape(timelineGroupCreateArgs),
    },
    (input, userId) => createTimelineGroup(userId, input),
  );

  defineTool(
    server,
    "update_timeline_group",
    {
      title: "Update timeline group",
      description:
        "Change a timeline group. Only the fields sent change; `timelines` (the user's timeline ids, in order) replaces the whole list.",
      kind: "update",
      input: {
        timelineGroupId,
        ...convexToZodShape(timelineGroupUpdateArgs),
      },
    },
    ({ timelineGroupId, ...patch }, userId) =>
      updateTimelineGroup(userId, timelineGroupId, patch),
  );

  defineTool(
    server,
    "delete_timeline_group",
    {
      title: "Delete timeline group",
      description:
        "Permanently delete a timeline group. Its timelines are kept.",
      kind: "delete",
      input: {
        timelineGroupId,
      },
    },
    ({ timelineGroupId }, userId) =>
      deleteTimelineGroup(userId, timelineGroupId),
  );
}
