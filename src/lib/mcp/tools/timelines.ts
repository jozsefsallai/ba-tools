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
  createTimeline,
  deleteTimeline,
  getTimeline,
  listTimelines,
  updateTimeline,
} from "@/lib/public-api/resources/timelines.server";
import { timelineArgs } from "~convex-lib/validators";

const fields = convexToZodShape(timelineArgs);

const LAYOUT_GUIDE =
  'Layout: items flow left to right in one row until a `separator` with `orientation: "vertical"`, which starts a new row; `horizontal` separators only add a gap inside a row. Without vertical separators the whole rotation renders as one very long row, so break rows at natural points (a new phase, wave, or cost cycle), but don\'t put one after every skill. Keep `notes` to a few words (e.g. "after boss shield"), notes support new lines; long notes push the following cards far apart. Put longer explanations in `description` or a `text` item.';
const RAID_GUIDE =
  "Optional `raid` tags the timeline: `type` (Raid = Total Assault, EliminateRaid = Grand Assault, MultiFloorRaid = Final Restriction Release, TimeAttackDungeon = Joint Firing Drill, WorldRaid = Allied Operation), `boss` of that type (a drill type for Joint Firing Drill), `defenseTypes`, `terrains`, `difficulty` (Total and Grand Assault only) and `floor` from 1 to 124 (Final Restriction Release only). Send `null` to clear it.";
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
      description: `Save a timeline. \`items\` run in order: \`student\` items are EX skill uses (with optional \`targetId\` and \`notes\`), \`separator\` items space or break rows, and \`text\` items add labels. Student ids come from \`search_students\`. To attach a team, send \`formation\`, the timeline's own copy, which is public whenever the timeline is; \`formationId\` optionally links it to a saved formation. ${LAYOUT_GUIDE} ${RAID_GUIDE}`,
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
