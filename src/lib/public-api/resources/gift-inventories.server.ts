import "server-only";

import {
  buildTargetAllocationsFromDoc,
  getGiftBoxExpPerUnit,
  getGiftExpValue,
  normalizeTargetGiftBoxCount,
} from "@/lib/bond/gift-utils";
import {
  clampBondExp,
  getBondProgress,
  getRankProgress,
  getRemainingExpOptions,
} from "@/lib/bond/progress";
import { getBondData } from "@/lib/data/gifts.server";
import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { notFound } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";
import type { Doc, Id } from "~convex/dataModel";

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
  const { inventory, targets } = await findInventory(userId, inventoryId);

  const target = targets.find((item) => item._id === targetId);
  if (!target) {
    throw notFound("Gift Target not found.");
  }

  return {
    inventory,
    target,
  };
}

async function withProgress(
  inventory: Doc<"giftInventory">,
  targets: Doc<"giftTarget">[],
  detailed = false,
) {
  const giftIds = [
    ...new Set(
      targets.flatMap((target) => target.gifts.map((gift) => gift.id)),
    ),
  ];

  const { students, gifts } = await getBondData(
    targets.map((target) => target.studentId),
    giftIds,
  );

  const inventoryCounts = Object.fromEntries(
    inventory.gifts.map((gift) => [
      gift.id,
      gift.count,
    ]),
  );

  return targets.map((target) => {
    const student = students.get(target.studentId);
    if (!student) {
      return {
        ...target,
        progress: null,
      };
    }

    const allocations = buildTargetAllocationsFromDoc(
      target,
      giftIds,
      inventoryCounts,
    );

    const progress = getBondProgress({
      currentExp: target.currentExp,
      targetExp: target.targetExp,
      giftExp: gifts.reduce(
        (total, gift) =>
          total + allocations[gift.id] * getGiftExpValue(gift, student),
        0,
      ),
      giftBoxExp:
        normalizeTargetGiftBoxCount(target, inventory.giftBoxes ?? 0) *
        getGiftBoxExpPerUnit(student),
    });

    const missingExp = progress.target?.expNeededAfterGifts ?? 0;

    return {
      ...target,
      progress: detailed
        ? {
            ...progress,
            remaining:
              missingExp > 0
                ? getRemainingExpOptions(missingExp, student)
                : null,
          }
        : progress,
    };
  });
}

export async function listGiftInventories(userId: string) {
  const [inventories, targets] = await Promise.all([
    userQuery(userId, api.gifts.getOwn, {}),
    userQuery(userId, api.gifts.getOwnTargets, {}),
  ]);

  return toResource(
    inventories.map((inventory) => ({
      ...inventory,
      targets: targets
        .filter((target) => target.giftInventoryId === inventory._id)
        .map(({ _id, studentId, targetExp, currentExp }) => ({
          id: _id,
          studentId,
          targetExp: targetExp ?? null,
          current: getRankProgress(clampBondExp(currentExp)),
        })),
    })),
  );
}

export async function getGiftInventory(userId: string, id: string) {
  const { inventory, targets } = await findInventory(userId, id);
  return toResource({
    ...inventory,
    targets: await withProgress(inventory, targets),
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
  const { inventory, target } = await findTarget(userId, inventoryId, targetId);
  const [withDetails] = await withProgress(
    inventory,
    [
      target,
    ],
    true,
  );

  return toResource(withDetails);
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
  const { target } = await findTarget(userId, inventoryId, targetId);

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
  const { target } = await findTarget(userId, inventoryId, targetId);
  await userMutation(userId, api.gifts.destroyTarget, {
    id: target._id,
  });
}
