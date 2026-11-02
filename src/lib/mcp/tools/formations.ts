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
  createFormation,
  deleteFormation,
  getFormation,
  listFormations,
  updateFormation,
} from "@/lib/public-api/resources/formations.server";
import { formationArgs } from "~convex-lib/validators";

const fields = convexToZodShape(formationArgs);
const formationId = idInput("Formation id.");

export function registerFormationTools(server: McpServer) {
  defineTool(
    server,
    "list_formations",
    {
      title: "List my formations",
      description:
        "The user's saved formations (echelons), newest first. Paginated.",
      kind: "read",
      input: paginationInput,
    },
    (input, userId) => listFormations(userId, paginationOpts(input)),
  );

  defineTool(
    server,
    "get_formation",
    {
      title: "Get formation",
      description: "One of the user's formations.",
      kind: "read",
      input: {
        formationId,
      },
    },
    ({ formationId }, userId) => getFormation(userId, formationId),
  );

  defineTool(
    server,
    "create_formation",
    {
      title: "Create formation",
      description:
        "Save a formation. `strikers` and `specials` hold the slots in order; leave `studentId` out for an empty slot. Student ids come from `search_students`. `rows` adds more rows for multi-team formations.",
      kind: "create",
      input: fields,
    },
    (input, userId) => createFormation(userId, input),
  );

  defineTool(
    server,
    "update_formation",
    {
      title: "Update formation",
      description:
        "Change a formation. Only the fields sent change; arrays sent replace the whole array.",
      kind: "update",
      input: {
        formationId,
        ...z.object(fields).partial().shape,
      },
    },
    ({ formationId, ...patch }, userId) =>
      updateFormation(userId, formationId, patch),
  );

  defineTool(
    server,
    "delete_formation",
    {
      title: "Delete formation",
      description: "Permanently delete a formation.",
      kind: "delete",
      input: {
        formationId,
      },
    },
    ({ formationId }, userId) => deleteFormation(userId, formationId),
  );
}
