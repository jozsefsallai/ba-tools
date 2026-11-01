import { getTarget } from "@/app/api/v1/me/gift-inventories/_lib/inventory.server";
import { type UserArgs, userMutation } from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";

type Params = { id: string; targetId: string };

export const GET = userRoute<Params>(async (_req, { id, targetId }, userId) => {
  return ok(toResource(await getTarget(userId, id, targetId)), {
    cache: "private",
  });
});

export const PATCH = userRoute<Params>(
  async (req, { id, targetId }, userId) => {
    const body = await readJsonObject(req);
    const target = await getTarget(userId, id, targetId);

    await userMutation(userId, api.gifts.updateTarget, {
      ...body,
      id: target._id,
    } as UserArgs<typeof api.gifts.updateTarget>);

    return ok(toResource(await getTarget(userId, id, targetId)), {
      cache: "private",
    });
  },
);

export const DELETE = userRoute<Params>(
  async (_req, { id, targetId }, userId) => {
    const target = await getTarget(userId, id, targetId);
    await userMutation(userId, api.gifts.destroyTarget, { id: target._id });
    return new Response(null, { status: 204 });
  },
);
