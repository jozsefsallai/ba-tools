import { convexToZodShape } from "@/lib/mcp/convex-to-zod";
import {
  defineTool,
  idInput,
  paginationInput,
  paginationOpts,
} from "@/lib/mcp/define-tool";
import {
  createTimeline,
  deleteTimeline,
  getTimeline,
  listTimelines,
  updateTimeline,
} from "@/lib/public-api/resources/timelines.server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { timelineArgs } from "~convex-lib/validators";

const fields = convexToZodShape(timelineArgs);
const timelineId = idInput("Timeline id.");

export function registerTimelineTools(server: McpServer) {
  defineTool(
    server,
    "list_timelines",
    {
      title: "List my timelines",
      description:
        "The user's timelines (skill rotations), newest first. Paginated.",
      kind: "read",
      input: paginationInput,
    },
    (input, userId) => listTimelines(userId, paginationOpts(input)),
  );

  defineTool(
    server,
    "get_timeline",
    {
      title: "Get timeline",
      description: "One of the user's timelines, public or private.",
      kind: "read",
      input: { timelineId },
    },
    ({ timelineId }, userId) => getTimeline(userId, timelineId),
  );

  defineTool(
    server,
    "create_timeline",
    {
      title: "Create timeline",
      description:
        "Save a timeline. `items` run in order: `student` items are EX skill uses (with optional `targetId` and `notes`), `separator` items break lines, and `text` items add labels. Student ids come from `search_students`.",
      kind: "create",
      input: fields,
    },
    (input, userId) => createTimeline(userId, input),
  );

  defineTool(
    server,
    "update_timeline",
    {
      title: "Update timeline",
      description:
        "Change a timeline. Only the fields sent change; `items` sent replaces the whole list.",
      kind: "update",
      input: { timelineId, ...z.object(fields).partial().shape },
    },
    ({ timelineId, ...patch }, userId) =>
      updateTimeline(userId, timelineId, patch),
  );

  defineTool(
    server,
    "delete_timeline",
    {
      title: "Delete timeline",
      description: "Permanently delete a timeline.",
      kind: "delete",
      input: { timelineId },
    },
    ({ timelineId }, userId) => deleteTimeline(userId, timelineId),
  );
}
