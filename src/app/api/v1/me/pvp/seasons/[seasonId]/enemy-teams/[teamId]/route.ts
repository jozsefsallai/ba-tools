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

type Params = { seasonId: string; teamId: string };

async function getTeam(userId: string, { seasonId, teamId }: Params) {
  return await userQuery(userId, api.pvp.getEnemyTeam, {
    seasonId: seasonId as Id<"pvpSeason">,
    teamId: teamId as Id<"pvpEnemyTeam">,
  });
}

export const GET = userRoute<Params>(async (_req, params, userId) => {
  return ok(toResource(await getTeam(userId, params)), { cache: "private" });
});

export const PATCH = userRoute<Params>(async (req, params, userId) => {
  const body = await readJsonObject(req);

  const current = await getTeam(userId, params);

  const teamId = await userMutation(userId, api.pvp.updateEnemyTeam, {
    ...body,
    teamId: current._id,
  } as UserArgs<typeof api.pvp.updateEnemyTeam>);

  return ok(toResource(await getTeam(userId, { ...params, teamId })), {
    cache: "private",
  });
});

export const DELETE = userRoute<Params>(async (_req, params, userId) => {
  const team = await getTeam(userId, params);
  await userMutation(userId, api.pvp.deleteEnemyTeam, { teamId: team._id });
  return new Response(null, { status: 204 });
});
