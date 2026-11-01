import {
  getInventory,
  inventoryResource,
} from "@/app/api/v1/me/gift-inventories/_lib/inventory.server";
import { type UserArgs, userMutation } from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

type Params = { id: string };

export const GET = userRoute<Params>(async (_req, { id }, userId) => {
  return ok(inventoryResource(await getInventory(userId, id)), {
    cache: "private",
  });
});

export const PATCH = userRoute<Params>(async (req, { id }, userId) => {
  const body = await readJsonObject(req);

  await userMutation(userId, api.gifts.updateInventory, {
    ...body,
    id: id as Id<"giftInventory">,
  } as UserArgs<typeof api.gifts.updateInventory>);

  return ok(inventoryResource(await getInventory(userId, id)), {
    cache: "private",
  });
});

export const DELETE = userRoute<Params>(async (_req, { id }, userId) => {
  await userMutation(userId, api.gifts.destroyInventory, {
    id: id as Id<"giftInventory">,
  });

  return new Response(null, { status: 204 });
});
