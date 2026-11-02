import { createPvpEnemyTeam } from "@/lib/public-api/resources/pvp.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";

type Params = { seasonId: string };

export const POST = userRoute<Params>(async (req, { seasonId }, userId) => {
  return ok(
    await createPvpEnemyTeam(userId, seasonId, await readJsonObject(req)),
    {
      cache: "private",
      status: 201,
    },
  );
});
