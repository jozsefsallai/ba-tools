import "server-only";

import { userQuery } from "@/lib/public-api/convex.server";
import { notFound } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export async function getInventory(userId: string, id: string) {
  const { inventory, targets } = await userQuery(userId, api.gifts.getOwnById, {
    id: id as Id<"giftInventory">,
  });

  return { inventory, targets };
}

export function inventoryResource({
  inventory,
  targets,
}: Awaited<ReturnType<typeof getInventory>>) {
  return toResource({ ...inventory, targets });
}

export async function getTarget(
  userId: string,
  inventoryId: string,
  targetId: string,
) {
  const { targets } = await getInventory(userId, inventoryId);

  const target = targets.find((item) => item._id === targetId);
  if (!target) {
    throw notFound("Gift Target not found.");
  }

  return target;
}
