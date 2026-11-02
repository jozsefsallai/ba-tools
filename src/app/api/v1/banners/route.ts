import { listBanners } from "@/lib/public-api/resources/game-data.server";
import { ok } from "@/lib/public-api/response";
import { publicRoute } from "@/lib/public-api/route";

export const GET = publicRoute(async () => {
  return ok(await listBanners(), {
    cache: "public",
  });
});
