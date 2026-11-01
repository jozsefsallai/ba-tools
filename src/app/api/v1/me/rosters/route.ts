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

export const GET = userRoute(async (_req, _params, userId) => {
  return ok(toResource(await userQuery(userId, api.roster.getOwn, {})), {
    cache: "private",
  });
});

export const POST = userRoute(async (req, _params, userId) => {
  const body = await readJsonObject(req);

  const id = await userMutation(
    userId,
    api.roster.create,
    body as UserArgs<typeof api.roster.create>,
  );

  const roster = await userQuery(userId, api.roster.getOwnById, { id });

  invalidatePublicRosters(roster);

  return ok(toResource(roster), { cache: "private", status: 201 });
});
