import {
  listMissionSummaries,
  missionSearchSchema,
} from "@/lib/public-api/resources/missions.server";
import { ok } from "@/lib/public-api/response";
import { parseQuery, publicRoute } from "@/lib/public-api/route";

export const GET = publicRoute(async (req) => {
  return ok(await listMissionSummaries(parseQuery(req, missionSearchSchema)), {
    cache: "public",
  });
});
