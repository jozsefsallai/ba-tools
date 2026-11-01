import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import { parseQuery, readJsonObject, userRoute } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { z } from "zod";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

type Params = { seasonId: string };

const querySchema = z.object({
  from: z.coerce.number().int().optional(),
  to: z.coerce.number().int().optional(),
});

export const GET = userRoute<Params>(async (req, { seasonId }, userId) => {
  const { from, to } = parseQuery(req, querySchema);

  const id = seasonId as Id<"pvpSeason">;

  const { matches } =
    from !== undefined || to !== undefined
      ? await userQuery(userId, api.pvp.getMatchesForSeasonRange, {
          seasonId: id,
          startDate: from ?? 0,
          endDate: to ?? Number.MAX_SAFE_INTEGER,
        })
      : await userQuery(userId, api.pvp.getMatchesForSeason, { seasonId: id });

  return ok(toResource(matches), { cache: "private" });
});

export const POST = userRoute<Params>(async (req, { seasonId }, userId) => {
  const body = await readJsonObject(req);

  const matchId = await userMutation(userId, api.pvp.recordMatch, {
    ...body,
    seasonId: seasonId as Id<"pvpSeason">,
  } as UserArgs<typeof api.pvp.recordMatch>);

  const match = await userQuery(userId, api.pvp.getMatchById, {
    seasonId: seasonId as Id<"pvpSeason">,
    matchId,
  });

  return ok(toResource(match), { cache: "private", status: 201 });
});
