import { getMissionDetail } from "@/lib/public-api/resources/missions.server";
import { ok } from "@/lib/public-api/response";
import { publicRoute } from "@/lib/public-api/route";

export const GET = publicRoute<{
  label: string;
}>(async (_req, { label }) => {
  return ok(await getMissionDetail(decodeURIComponent(label)), {
    cache: "public",
  });
});
