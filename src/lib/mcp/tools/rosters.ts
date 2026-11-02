import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { convexToZodShape } from "@/lib/mcp/convex-to-zod";
import { defineTool, idInput } from "@/lib/mcp/define-tool";
import {
  createRoster,
  deleteRoster,
  getRoster,
  listRosters,
  updateRoster,
} from "@/lib/public-api/resources/rosters.server";
import { rosterCreateArgs, rosterUpdateArgs } from "~convex-lib/validators";

const rosterId = idInput("Roster id.");

export function registerRosterTools(server: McpServer) {
  defineTool(
    server,
    "list_rosters",
    {
      title: "List my rosters",
      description:
        "The user's game account rosters: the students they own and how far each is built.",
      kind: "read",
    },
    (_input, userId) => listRosters(userId),
  );

  defineTool(
    server,
    "get_roster",
    {
      title: "Get roster",
      description: "One of the user's rosters, with every student entry.",
      kind: "read",
      input: {
        rosterId,
      },
    },
    ({ rosterId }, userId) => getRoster(userId, rosterId),
  );

  defineTool(
    server,
    "create_roster",
    {
      title: "Create roster",
      description:
        "Create a roster for a game account. `friendCode` is the account's 8-letter friend code (A-Z) and must be unique per game server. Add students with `update_roster`.",
      kind: "create",
      input: convexToZodShape(rosterCreateArgs),
    },
    (input, userId) => createRoster(userId, input),
  );

  defineTool(
    server,
    "update_roster",
    {
      title: "Update roster",
      description:
        "Change a roster. Only the fields sent change; `students` replaces the whole student list, so send every entry.",
      kind: "update",
      input: {
        rosterId,
        ...convexToZodShape(rosterUpdateArgs),
      },
    },
    ({ rosterId, ...patch }, userId) => updateRoster(userId, rosterId, patch),
  );

  defineTool(
    server,
    "delete_roster",
    {
      title: "Delete roster",
      description: "Permanently delete a roster.",
      kind: "delete",
      input: {
        rosterId,
      },
    },
    ({ rosterId }, userId) => deleteRoster(userId, rosterId),
  );
}
