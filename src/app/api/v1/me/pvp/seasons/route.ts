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
  return ok(toResource(await userQuery(userId, api.pvp.getOwnSeasons, {})), {
    cache: "private",
  });
});

export const POST = userRoute(async (req, _params, userId) => {
  const body = await readJsonObject(req);

  const seasonId = await userMutation(
    userId,
    api.pvp.createSeason,
    body as UserArgs<typeof api.pvp.createSeason>,
  );

  const season = await userQuery(userId, api.pvp.getSeason, { seasonId });

  return ok(toResource(season), { cache: "private", status: 201 });
});
