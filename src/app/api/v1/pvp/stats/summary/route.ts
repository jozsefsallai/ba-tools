import { seasonNumberSchema } from "@/app/api/v1/pvp/stats/_lib/schemas";
import { publicQuery } from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import { parseQuery, publicRoute } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { z } from "zod";
import { api } from "~convex/api";

const querySchema = z.object({ season: seasonNumberSchema });

export const GET = publicRoute(async (req) => {
  const { season } = parseQuery(req, querySchema);

  return ok(
    toResource(
      await publicQuery(api.pvpStats.getSummary, { seasonNumber: season }),
    ),
    { cache: "public" },
  );
});
