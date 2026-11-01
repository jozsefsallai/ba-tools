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

type Params = { seasonId: string; matchId: string };

async function getMatch(userId: string, { seasonId, matchId }: Params) {
  return await userQuery(userId, api.pvp.getMatchById, {
    seasonId: seasonId as Id<"pvpSeason">,
    matchId: matchId as Id<"pvpMatchRecord">,
  });
}

export const GET = userRoute<Params>(async (_req, params, userId) => {
  return ok(toResource(await getMatch(userId, params)), { cache: "private" });
});

export const PATCH = userRoute<Params>(async (req, params, userId) => {
  const body = await readJsonObject(req);

  const current = await getMatch(userId, params);

  const match = await userMutation(userId, api.pvp.updateMatch, {
    ...body,
    matchId: current._id,
  } as UserArgs<typeof api.pvp.updateMatch>);

  return ok(toResource(match), { cache: "private" });
});

export const DELETE = userRoute<Params>(async (_req, params, userId) => {
  const match = await getMatch(userId, params);
  await userMutation(userId, api.pvp.deleteMatch, { matchId: match._id });
  return new Response(null, { status: 204 });
});
