import { getCachedGameBanners } from "@/lib/game-banners.server";
import { ok } from "@/lib/public-api/response";
import { publicRoute } from "@/lib/public-api/route";

export const GET = publicRoute(async () => {
  return ok(await getCachedGameBanners(), { cache: "public" });
});
