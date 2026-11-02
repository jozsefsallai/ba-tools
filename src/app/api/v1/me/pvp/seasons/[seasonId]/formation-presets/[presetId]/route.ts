import {
  deletePvpFormationPreset,
  getPvpFormationPreset,
  updatePvpFormationPreset,
} from "@/lib/public-api/resources/pvp.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";

type Params = { seasonId: string; presetId: string };

export const GET = userRoute<Params>(
  async (_req, { seasonId, presetId }, userId) => {
    return ok(await getPvpFormationPreset(userId, seasonId, presetId), {
      cache: "private",
    });
  },
);

export const PATCH = userRoute<Params>(
  async (req, { seasonId, presetId }, userId) => {
    return ok(
      await updatePvpFormationPreset(
        userId,
        seasonId,
        presetId,
        await readJsonObject(req),
      ),
      {
        cache: "private",
      },
    );
  },
);

export const DELETE = userRoute<Params>(
  async (_req, { seasonId, presetId }, userId) => {
    await deletePvpFormationPreset(userId, seasonId, presetId);
    return new Response(null, { status: 204 });
  },
);
