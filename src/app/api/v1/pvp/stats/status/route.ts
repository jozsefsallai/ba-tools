import { getPvpStatsStatus } from "@/lib/public-api/resources/pvp-stats.server";
import { ok } from "@/lib/public-api/response";
import { publicRoute } from "@/lib/public-api/route";

export const GET = publicRoute(async () => {
  return ok(await getPvpStatsStatus(), { cache: "public" });
});
