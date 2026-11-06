import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { convexToZodShape } from "@/lib/mcp/convex-to-zod";
import {
  defineTool,
  idInput,
  paginationInput,
  paginationOpts,
} from "@/lib/mcp/define-tool";
import { timelineDocs } from "@/lib/mcp/field-docs";
import {
  createTimeline,
  deleteTimeline,
  getTimeline,
  listTimelines,
  updateTimeline,
} from "@/lib/public-api/resources/timelines.server";
import { timelineArgs } from "~convex-lib/validators";

const fields = convexToZodShape(timelineArgs, timelineDocs);

export const LAYOUT_GUIDE =
  'Layout: items flow left to right in one row until a `separator` with `orientation: "vertical"`, which starts a new row; `horizontal` separators only add a gap inside a row. Without vertical separators the whole rotation renders as one very long row, so break rows at natural points (a new phase, wave, or cost cycle), but don\'t put one after every skill. Keep `notes` to a few words (e.g. "after boss shield"), notes support new lines; long notes push the following cards far apart. Put costs and timings in `trigger`, not `notes`, and longer explanations in `description` or a `text` item.';
export const RAID_GUIDE =
  "Set `raid` when the timeline is for a specific raid or boss.";
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
      input: {
        timelineId,
      },
    },
    ({ timelineId }, userId) => getTimeline(userId, timelineId),
  );

  defineTool(
    server,
    "create_timeline",
    {
      title: "Create timeline",
      description: `Save a timeline. \`items\` run in order: \`student\` items are skill cards (EX skill uses), \`separator\` items space or break rows, and \`text\` items add labels. Skill cards can show a \`trigger\` (cost or time), targets (\`targetId\`, \`extraTargetIds\`), a \`copy\` marker, a \`highlightColor\`, alternate art (\`variantId\`) and \`notes\`; use whichever apply, e.g. \`{ "type": "student", "studentId": "<id>", "trigger": "6", "targetId": "<id>", "copy": true }\`. Student ids come from \`search_students\`. To attach a team, send \`formation\`; \`formationId\` optionally links it to a saved formation. ${LAYOUT_GUIDE} ${RAID_GUIDE}`,
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
      description: `Change a timeline. Only the fields sent change; \`items\` sent replaces the whole list. ${LAYOUT_GUIDE} ${RAID_GUIDE}`,
      kind: "update",
      input: {
        timelineId,
        ...z.object(fields).partial().shape,
      },
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
      input: {
        timelineId,
      },
    },
    ({ timelineId }, userId) => deleteTimeline(userId, timelineId),
  );
}
