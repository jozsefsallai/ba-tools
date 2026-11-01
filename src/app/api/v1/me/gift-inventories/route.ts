import {
  getInventory,
  inventoryResource,
} from "@/app/api/v1/me/gift-inventories/_lib/inventory.server";
import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";

export const GET = userRoute(async (_req, _params, userId) => {
  return ok(toResource(await userQuery(userId, api.gifts.getOwn, {})), {
    cache: "private",
  });
});

export const POST = userRoute(async (req, _params, userId) => {
  const body = await readJsonObject(req);

  const id = await userMutation(
    userId,
    api.gifts.createInventory,
    body as UserArgs<typeof api.gifts.createInventory>,
  );

  return ok(inventoryResource(await getInventory(userId, id)), {
    cache: "private",
    status: 201,
  });
});
