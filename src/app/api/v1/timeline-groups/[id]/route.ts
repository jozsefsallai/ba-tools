import { getPublicTimelineGroup } from "@/lib/public-api/resources/shared-content.server";
import { ok } from "@/lib/public-api/response";
import { publicRoute } from "@/lib/public-api/route";

export const GET = publicRoute<{
  id: string;
}>(async (_req, { id }) => {
  return ok(await getPublicTimelineGroup(id), {
    cache: "shared",
  });
});
