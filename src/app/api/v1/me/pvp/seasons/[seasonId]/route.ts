import {
  deletePvpSeason,
  getPvpSeason,
  updatePvpSeason,
} from "@/lib/public-api/resources/pvp.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";

type Params = { seasonId: string };

export const GET = userRoute<Params>(async (_req, { seasonId }, userId) => {
  return ok(await getPvpSeason(userId, seasonId), { cache: "private" });
});

export const PATCH = userRoute<Params>(async (req, { seasonId }, userId) => {
  return ok(
    await updatePvpSeason(userId, seasonId, await readJsonObject(req)),
    {
      cache: "private",
    },
  );
});

export const DELETE = userRoute<Params>(async (_req, { seasonId }, userId) => {
  await deletePvpSeason(userId, seasonId);
  return new Response(null, { status: 204 });
});
