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

type Params = { seasonId: string };

const UPDATE_KEYS = ["name", "gameServer", "seasonNumber"] as const;

export const GET = userRoute<Params>(async (_req, { seasonId }, userId) => {
  const season = await userQuery(userId, api.pvp.getSeason, {
    seasonId: seasonId as Id<"pvpSeason">,
  });

  return ok(toResource(season), { cache: "private" });
});

export const PATCH = userRoute<Params>(async (req, { seasonId }, userId) => {
  const { archived, ...body } = await readJsonObject(req);

  const current = await userQuery(userId, api.pvp.getSeason, {
    seasonId: seasonId as Id<"pvpSeason">,
  });

  if (Object.keys(body).length > 0) {
    await userMutation(userId, api.pvp.updateSeason, {
      ...mergeForUpdate(current, UPDATE_KEYS, body),
      seasonId: current._id,
    } as UserArgs<typeof api.pvp.updateSeason>);
  }

  if (archived !== undefined) {
    await userMutation(userId, api.pvp.setSeasonArchived, {
      seasonId: current._id,
      archived: archived as boolean,
    });
  }

  const season = await userQuery(userId, api.pvp.getSeason, {
    seasonId: current._id,
  });

  return ok(toResource(season), { cache: "private" });
});

export const DELETE = userRoute<Params>(async (_req, { seasonId }, userId) => {
  await userMutation(userId, api.pvp.deleteSeason, {
    seasonId: seasonId as Id<"pvpSeason">,
  });

  return new Response(null, { status: 204 });
});
