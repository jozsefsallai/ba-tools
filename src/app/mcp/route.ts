import { createMcpHandler, withMcpAuth } from "mcp-handler";
import {
  MCP_RESOURCE_METADATA_PATH,
  verifyMcpToken,
} from "@/lib/mcp/auth.server";
import { registerMcpTools } from "@/lib/mcp/register-tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const handler = createMcpHandler(
  (server) => {
    registerMcpTools(server);
  },
  {
    serverInfo: {
      name: "ba-tools",
      version: "0.2.0",
    },
    instructions: [
      "Blue Archive Tools (ba.joexyz.online): game data, PvP stats, and the signed-in user's saved formations, timelines, rosters, gift inventories, PvP logs and recruitment logs.",
      "Enum values in results are internal names. Each comes with a `…Label` field holding the in-game name (e.g. `defenseType: Unarmed` is Special armor, `combatClass: Main` is Striker); always use the label when talking to the user.",
      "Refer to gifts and students by name rather than id. Gift entries already include `name`; look students up with `get_student` or `search_students` when only an id is present.",
      "Players often call attack and defense types by color: red = Explosive damage and Light armor, yellow = Piercing and Heavy, blue = Mystic and Special, purple = Sonic and Elastic, green = Corrosive and Composite. Inputs for these types accept the color names.",
      "Details left out when creating timelines, formations and PvP matches use the user's preferences (`get_preferences`), so only send them when the user asks for something specific.",
      "Before writing data, read the tool's field descriptions, including nested ones: most details have a dedicated field, so don't put them in free-text fields.",
      "When building timelines, follow the layout rules in `create_timeline`: put costs and timings in `trigger`, mark targets and copied skills with their own fields, break long rotations into rows with vertical separators, and keep notes short.",
    ].join("\n\n"),
  },
  {
    basePath: "",
    verboseLogs: true,
    maxDuration: 60,
    disableSse: true,
  },
);

const authHandler = withMcpAuth(handler, verifyMcpToken, {
  required: true,
  resourceMetadataPath: MCP_RESOURCE_METADATA_PATH,
});

export { authHandler as GET, authHandler as POST };
