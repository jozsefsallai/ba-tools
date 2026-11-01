import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import {
  mergeForUpdate,
  readJsonObject,
  userRoute,
} from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

type Params = { id: string };

const UPDATE_KEYS = [
  "name",
  "description",
  "visibility",
  "showCreator",
  "items",
  "itemSpacing",
  "verticalSeparatorSize",
  "horizontalSeparatorSize",
  "exportWithTransparentBackground",
  "exportBackgroundColor",
  "exportBackgroundOpacity",
] as const;

export const GET = userRoute<Params>(async (_req, { id }, userId) => {
  const timeline = await userQuery(userId, api.timeline.getOwnById, {
    id: id as Id<"timeline">,
  });

  return ok(toResource(timeline), { cache: "private" });
});

export const PATCH = userRoute<Params>(async (req, { id }, userId) => {
  const body = await readJsonObject(req);

  const current = await userQuery(userId, api.timeline.getOwnById, {
    id: id as Id<"timeline">,
  });

  const timeline = await userMutation(userId, api.timeline.update, {
    ...mergeForUpdate(current, UPDATE_KEYS, body),
    id: current._id,
  } as UserArgs<typeof api.timeline.update>);

  return ok(toResource(timeline), { cache: "private" });
});

export const DELETE = userRoute<Params>(async (_req, { id }, userId) => {
  await userMutation(userId, api.timeline.destroy, {
    id: id as Id<"timeline">,
  });

  return new Response(null, { status: 204 });
});
