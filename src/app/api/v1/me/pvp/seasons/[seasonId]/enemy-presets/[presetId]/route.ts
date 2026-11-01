import { getEnemyPreset } from "@/app/api/v1/me/pvp/_lib/presets.server";
import { type UserArgs, userMutation } from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";

type Params = { seasonId: string; presetId: string };

export const GET = userRoute<Params>(
  async (_req, { seasonId, presetId }, userId) => {
    return ok(toResource(await getEnemyPreset(userId, seasonId, presetId)), {
      cache: "private",
    });
  },
);

export const PATCH = userRoute<Params>(
  async (req, { seasonId, presetId }, userId) => {
    const body = await readJsonObject(req);

    const current = await getEnemyPreset(userId, seasonId, presetId);

    await userMutation(userId, api.pvp.updateEnemyPreset, {
      ...body,
      presetId: current._id,
    } as UserArgs<typeof api.pvp.updateEnemyPreset>);

    return ok(toResource(await getEnemyPreset(userId, seasonId, presetId)), {
      cache: "private",
    });
  },
);

export const DELETE = userRoute<Params>(
  async (_req, { seasonId, presetId }, userId) => {
    const preset = await getEnemyPreset(userId, seasonId, presetId);

    await userMutation(userId, api.pvp.deleteEnemyPreset, {
      presetId: preset._id,
    });

    return new Response(null, { status: 204 });
  },
);
