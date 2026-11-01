import { ok } from "@/lib/public-api/response";
import { publicRoute } from "@/lib/public-api/route";
import { getCachedRoadmapItems } from "@/lib/roadmap/roadmap.server";

export const GET = publicRoute(async () => {
  return ok(await getCachedRoadmapItems(), { cache: "public" });
});
