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

type Params = { seasonId: string };

export const POST = userRoute<Params>(async (req, { seasonId }, userId) => {
  const body = await readJsonObject(req);

  const teamId = await userMutation(userId, api.pvp.createEnemyTeam, {
    ...body,
    seasonId: seasonId as Id<"pvpSeason">,
  } as UserArgs<typeof api.pvp.createEnemyTeam>);

  const team = await userQuery(userId, api.pvp.getEnemyTeam, {
    seasonId: seasonId as Id<"pvpSeason">,
    teamId,
  });

  return ok(toResource(team), { cache: "private", status: 201 });
});
