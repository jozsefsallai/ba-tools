import {
  getPvpStatsSummary,
  pvpStatsSummarySchema,
} from "@/lib/public-api/resources/pvp-stats.server";
import { ok } from "@/lib/public-api/response";
import { parseQuery, publicRoute } from "@/lib/public-api/route";

export const GET = publicRoute(async (req) => {
  return ok(await getPvpStatsSummary(parseQuery(req, pvpStatsSummarySchema)), {
    cache: "public",
  });
});
