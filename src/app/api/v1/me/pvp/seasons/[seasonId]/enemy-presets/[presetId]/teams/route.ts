import { userQuery } from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import { userRoute } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

type Params = { seasonId: string; presetId: string };

export const GET = userRoute<Params>(
  async (_req, { seasonId, presetId }, userId) => {
    const { teams } = await userQuery(userId, api.pvp.getEnemyPresetTeams, {
      seasonId: seasonId as Id<"pvpSeason">,
      presetId: presetId as Id<"pvpEnemyPreset">,
    });

    return ok(toResource(teams), { cache: "private" });
  },
);
