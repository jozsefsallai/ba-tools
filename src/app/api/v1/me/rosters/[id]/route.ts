import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { invalidatePublicRosters } from "@/lib/roster-cache.server";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

type Params = { id: string };

export const GET = userRoute<Params>(async (_req, { id }, userId) => {
  const roster = await userQuery(userId, api.roster.getOwnById, {
    id: id as Id<"roster">,
  });

  return ok(toResource(roster), { cache: "private" });
});

export const PATCH = userRoute<Params>(async (req, { id }, userId) => {
  const body = await readJsonObject(req);

  const previous = await userQuery(userId, api.roster.getOwnById, {
    id: id as Id<"roster">,
  });

  const roster = await userMutation(userId, api.roster.update, {
    ...body,
    id: previous._id,
  } as UserArgs<typeof api.roster.update>);

  if (roster) {
    invalidatePublicRosters(previous, roster);
  }

  return ok(toResource(roster), { cache: "private" });
});

export const DELETE = userRoute<Params>(async (_req, { id }, userId) => {
  const roster = await userQuery(userId, api.roster.getOwnById, {
    id: id as Id<"roster">,
  });

  await userMutation(userId, api.roster.destroy, { id: roster._id });

  invalidatePublicRosters(roster);

  return new Response(null, { status: 204 });
});
