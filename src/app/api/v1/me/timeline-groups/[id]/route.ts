import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

type Params = { id: string };

export const GET = userRoute<Params>(async (_req, { id }, userId) => {
  const group = await userQuery(userId, api.timelineGroup.getOwnById, {
    id: id as Id<"timelineGroup">,
  });

  return ok(toResource(group), { cache: "private" });
});

export const PATCH = userRoute<Params>(async (req, { id }, userId) => {
  const body = await readJsonObject(req);

  await userMutation(userId, api.timelineGroup.update, {
    ...body,
    id: id as Id<"timelineGroup">,
  } as UserArgs<typeof api.timelineGroup.update>);

  const group = await userQuery(userId, api.timelineGroup.getOwnById, {
    id: id as Id<"timelineGroup">,
  });

  return ok(toResource(group), { cache: "private" });
});

export const DELETE = userRoute<Params>(async (_req, { id }, userId) => {
  await userMutation(userId, api.timelineGroup.destroy, {
    id: id as Id<"timelineGroup">,
  });

  return new Response(null, { status: 204 });
});
