import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { convexToZodShape } from "@/lib/mcp/convex-to-zod";
import { defineTool, idInput } from "@/lib/mcp/define-tool";
import {
  giftInventoryDocs,
  giftTargetCreateDocs,
  giftTargetUpdateDocs,
} from "@/lib/mcp/field-docs";
import {
  createGiftInventory,
  createGiftTarget,
  deleteGiftInventory,
  deleteGiftTarget,
  getGiftInventory,
  getGiftTarget,
  listGiftInventories,
  updateGiftInventory,
  updateGiftTarget,
} from "@/lib/public-api/resources/gift-inventories.server";
import {
  giftInventoryArgs,
  giftTargetCreateArgs,
  giftTargetUpdateArgs,
} from "~convex-lib/validators";

const inventoryId = idInput("Gift inventory id.");
const targetId = idInput("Gift target id.");

const GIFT_NAMES =
  "Each entry in `gifts` comes with the gift's `name`; refer to gifts by name, not id.";

export function registerGiftInventoryTools(server: McpServer) {
  defineTool(
    server,
    "list_gift_inventories",
    {
      title: "List my gift inventories",
      description: `The user's gift inventories for the bond calculator: gifts owned and gift boxes. ${GIFT_NAMES}`,
      kind: "read",
    },
    (_input, userId) => listGiftInventories(userId),
  );

  defineTool(
    server,
    "get_gift_inventory",
    {
      title: "Get gift inventory",
      description: `One gift inventory, with its targets (students the gifts are planned for). ${GIFT_NAMES}`,
      kind: "read",
      input: {
        inventoryId,
      },
    },
    ({ inventoryId }, userId) => getGiftInventory(userId, inventoryId),
  );

  defineTool(
    server,
    "create_gift_inventory",
    {
      title: "Create gift inventory",
      description:
        "Create a gift inventory. `gifts` lists `{ id, count }` with gift ids from `search_gifts`.",
      kind: "create",
      input: convexToZodShape(giftInventoryArgs, giftInventoryDocs),
    },
    (input, userId) => createGiftInventory(userId, input),
  );

  defineTool(
    server,
    "update_gift_inventory",
    {
      title: "Update gift inventory",
      description:
        "Change a gift inventory. Only the fields sent change; `gifts` replaces the whole list.",
      kind: "update",
      input: {
        inventoryId,
        ...convexToZodShape(giftInventoryArgs, giftInventoryDocs),
      },
    },
    ({ inventoryId, ...patch }, userId) =>
      updateGiftInventory(userId, inventoryId, patch),
  );

  defineTool(
    server,
    "delete_gift_inventory",
    {
      title: "Delete gift inventory",
      description: "Permanently delete a gift inventory and its targets.",
      kind: "delete",
      input: {
        inventoryId,
      },
    },
    ({ inventoryId }, userId) => deleteGiftInventory(userId, inventoryId),
  );

  defineTool(
    server,
    "get_gift_target",
    {
      title: "Get gift target",
      description: `One target of a gift inventory. ${GIFT_NAMES}`,
      kind: "read",
      input: {
        inventoryId,
        targetId,
      },
    },
    ({ inventoryId, targetId }, userId) =>
      getGiftTarget(userId, inventoryId, targetId),
  );

  defineTool(
    server,
    "create_gift_target",
    {
      title: "Create gift target",
      description:
        "Plan gifts for a student: their current and target bond EXP, and the gifts and gift boxes to give.",
      kind: "create",
      input: {
        inventoryId,
        ...convexToZodShape(giftTargetCreateArgs, giftTargetCreateDocs),
      },
    },
    ({ inventoryId, ...input }, userId) =>
      createGiftTarget(userId, inventoryId, input),
  );

  defineTool(
    server,
    "update_gift_target",
    {
      title: "Update gift target",
      description:
        "Change a gift target. Only the fields sent change; `gifts` replaces the whole list.",
      kind: "update",
      input: {
        inventoryId,
        targetId,
        ...convexToZodShape(giftTargetUpdateArgs, giftTargetUpdateDocs),
      },
    },
    ({ inventoryId, targetId, ...patch }, userId) =>
      updateGiftTarget(userId, inventoryId, targetId, patch),
  );

  defineTool(
    server,
    "delete_gift_target",
    {
      title: "Delete gift target",
      description: "Permanently delete a gift target.",
      kind: "delete",
      input: {
        inventoryId,
        targetId,
      },
    },
    ({ inventoryId, targetId }, userId) =>
      deleteGiftTarget(userId, inventoryId, targetId),
  );
}
