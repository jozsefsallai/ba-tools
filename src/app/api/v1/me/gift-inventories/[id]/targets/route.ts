import { getTarget } from "@/app/api/v1/me/gift-inventories/_lib/inventory.server";
import { type UserArgs, userMutation } from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

type Params = { id: string };

export const POST = userRoute<Params>(async (req, { id }, userId) => {
  const body = await readJsonObject(req);

  const targetId = await userMutation(userId, api.gifts.createTarget, {
    ...body,
    giftInventoryId: id as Id<"giftInventory">,
  } as UserArgs<typeof api.gifts.createTarget>);

  return ok(toResource(await getTarget(userId, id, targetId)), {
    cache: "private",
    status: 201,
  });
});
