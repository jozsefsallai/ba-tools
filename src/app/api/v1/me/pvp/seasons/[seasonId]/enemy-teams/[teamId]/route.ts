import {
  deletePvpEnemyTeam,
  getPvpEnemyTeam,
  updatePvpEnemyTeam,
} from "@/lib/public-api/resources/pvp.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";

type Params = {
  seasonId: string;
  teamId: string;
};

export const GET = userRoute<Params>(
  async (_req, { seasonId, teamId }, userId) => {
    return ok(await getPvpEnemyTeam(userId, seasonId, teamId), {
      cache: "private",
    });
  },
);

export const PATCH = userRoute<Params>(
  async (req, { seasonId, teamId }, userId) => {
    return ok(
      await updatePvpEnemyTeam(
        userId,
        seasonId,
        teamId,
        await readJsonObject(req),
      ),
      {
        cache: "private",
      },
    );
  },
);

export const DELETE = userRoute<Params>(
  async (_req, { seasonId, teamId }, userId) => {
    await deletePvpEnemyTeam(userId, seasonId, teamId);
    return new Response(null, {
      status: 204,
    });
  },
);
