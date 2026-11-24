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

const PROGRESS =
  "Each target's `progress` has the student's `current` bond rank and EXP, the EXP of the `planned` gifts and gift boxes, the rank and EXP they're `projected` to have once given those, and the `target` with the EXP still needed (`expNeeded` from now, `expNeededAfterGifts` once the planned gifts are given; `null` without a target). `exp` is total EXP; `rankExp` of `rankExpRequired` is the EXP within the rank and `expToNextRank` what's left of it (`null` at rank 100). Use these instead of calculating them.";

const REMAINING =
  "`progress.remaining` lists ways to gain the EXP missing after the planned gifts (`null` if none is): each `singleSource` alone, the `optimal` combinations with the fewest headpats and gifts, and `lessons` by location rank.";

const CURRENT_EXP =
  "Set the current EXP as a total (`currentExp`) or as a rank and the EXP within it (`currentRank`, `currentRankExp`)";

export function registerGiftInventoryTools(server: McpServer) {
  defineTool(
    server,
    "list_gift_inventories",
    {
      title: "List my gift inventories",
      description: `The user's gift inventories for the bond calculator: gifts owned, gift boxes, and a summary of the targets (the student and their current rank and EXP), which is the quickest way to find a student's target. ${GIFT_NAMES}`,
      kind: "read",
    },
    (_input, userId) => listGiftInventories(userId),
  );

  defineTool(
    server,
    "get_gift_inventory",
    {
      title: "Get gift inventory",
      description: `One gift inventory, with its targets (students the gifts are planned for). ${GIFT_NAMES} ${PROGRESS} Use \`get_gift_target\` for ways to gain the missing EXP.`,
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
      description: `One target of a gift inventory. ${GIFT_NAMES} ${PROGRESS} ${REMAINING}`,
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
      description: `Plan gifts for a student: their current and target bond EXP, and the gifts and gift boxes to give. ${CURRENT_EXP}. Returns the target with its \`progress\`, like \`get_gift_target\`.`,
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
      description: `Change a gift target. Only the fields sent change; \`gifts\` replaces the whole list. ${CURRENT_EXP}, or add to it with \`addExp\`. Returns the target with its \`progress\`, like \`get_gift_target\`.`,
      kind: "update",
      idempotent: false,
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
