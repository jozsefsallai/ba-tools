import "server-only";

import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { notFound } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

async function findInventory(userId: string, id: string) {
  return await userQuery(userId, api.gifts.getOwnById, {
    id: id as Id<"giftInventory">,
  });
}

async function findTarget(
  userId: string,
  inventoryId: string,
  targetId: string,
) {
  const { targets } = await findInventory(userId, inventoryId);

  const target = targets.find((item) => item._id === targetId);
  if (!target) {
    throw notFound("Gift Target not found.");
  }

  return target;
}

export async function listGiftInventories(userId: string) {
  return toResource(await userQuery(userId, api.gifts.getOwn, {}));
}

export async function getGiftInventory(userId: string, id: string) {
  const { inventory, targets } = await findInventory(userId, id);
  return toResource({
    ...inventory,
    targets,
  });
}

export async function createGiftInventory(
  userId: string,
  input: Record<string, unknown>,
) {
  const id = await userMutation(
    userId,
    api.gifts.createInventory,
    input as UserArgs<typeof api.gifts.createInventory>,
  );

  return await getGiftInventory(userId, id);
}

export async function updateGiftInventory(
  userId: string,
  id: string,
  patch: Record<string, unknown>,
) {
  await userMutation(userId, api.gifts.updateInventory, {
    ...patch,
    id: id as Id<"giftInventory">,
  } as UserArgs<typeof api.gifts.updateInventory>);

  return await getGiftInventory(userId, id);
}

export async function deleteGiftInventory(userId: string, id: string) {
  await userMutation(userId, api.gifts.destroyInventory, {
    id: id as Id<"giftInventory">,
  });
}

export async function getGiftTarget(
  userId: string,
  inventoryId: string,
  targetId: string,
) {
  return toResource(await findTarget(userId, inventoryId, targetId));
}

export async function createGiftTarget(
  userId: string,
  inventoryId: string,
  input: Record<string, unknown>,
) {
  const targetId = await userMutation(userId, api.gifts.createTarget, {
    ...input,
    giftInventoryId: inventoryId as Id<"giftInventory">,
  } as UserArgs<typeof api.gifts.createTarget>);

  return await getGiftTarget(userId, inventoryId, targetId);
}

export async function updateGiftTarget(
  userId: string,
  inventoryId: string,
  targetId: string,
  patch: Record<string, unknown>,
) {
  const target = await findTarget(userId, inventoryId, targetId);

  await userMutation(userId, api.gifts.updateTarget, {
    ...patch,
    id: target._id,
  } as UserArgs<typeof api.gifts.updateTarget>);

  return await getGiftTarget(userId, inventoryId, targetId);
}

export async function deleteGiftTarget(
  userId: string,
  inventoryId: string,
  targetId: string,
) {
  const target = await findTarget(userId, inventoryId, targetId);
  await userMutation(userId, api.gifts.destroyTarget, {
    id: target._id,
  });
}
