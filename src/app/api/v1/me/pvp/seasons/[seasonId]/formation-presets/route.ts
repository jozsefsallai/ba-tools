import { getFormationPreset } from "@/app/api/v1/me/pvp/_lib/presets.server";
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

const querySchema = z.object({ search: z.string().optional() });

export const GET = userRoute<Params>(async (req, { seasonId }, userId) => {
  const { search } = parseQuery(req, querySchema);

  const presets = await userQuery(userId, api.pvp.listFormationPresets, {
    seasonId: seasonId as Id<"pvpSeason">,
    search,
  });

  return ok(toResource(presets), { cache: "private" });
});

export const POST = userRoute<Params>(async (req, { seasonId }, userId) => {
  const body = await readJsonObject(req);

  const presetId = await userMutation(userId, api.pvp.createFormationPreset, {
    ...body,
    seasonId: seasonId as Id<"pvpSeason">,
  } as UserArgs<typeof api.pvp.createFormationPreset>);

  return ok(toResource(await getFormationPreset(userId, seasonId, presetId)), {
    cache: "private",
    status: 201,
  });
});
