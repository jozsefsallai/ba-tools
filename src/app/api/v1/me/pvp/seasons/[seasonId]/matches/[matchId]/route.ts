import {
  deletePvpMatch,
  getPvpMatch,
  updatePvpMatch,
} from "@/lib/public-api/resources/pvp.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";

type Params = {
  seasonId: string;
  matchId: string;
};

export const GET = userRoute<Params>(
  async (_req, { seasonId, matchId }, userId) => {
    return ok(await getPvpMatch(userId, seasonId, matchId), {
      cache: "private",
    });
  },
);

export const PATCH = userRoute<Params>(
  async (req, { seasonId, matchId }, userId) => {
    return ok(
      await updatePvpMatch(
        userId,
        seasonId,
        matchId,
        await readJsonObject(req),
      ),
      {
        cache: "private",
      },
    );
  },
);

export const DELETE = userRoute<Params>(
  async (_req, { seasonId, matchId }, userId) => {
    await deletePvpMatch(userId, seasonId, matchId);
    return new Response(null, {
      status: 204,
    });
  },
);
