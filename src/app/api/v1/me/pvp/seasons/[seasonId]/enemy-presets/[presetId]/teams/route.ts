import { listPvpEnemyPresetTeams } from "@/lib/public-api/resources/pvp.server";
import { ok } from "@/lib/public-api/response";
import { userRoute } from "@/lib/public-api/route";

type Params = {
  seasonId: string;
  presetId: string;
};

export const GET = userRoute<Params>(
  async (_req, { seasonId, presetId }, userId) => {
    return ok(await listPvpEnemyPresetTeams(userId, seasonId, presetId), {
      cache: "private",
    });
  },
);
