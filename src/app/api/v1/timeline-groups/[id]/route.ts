import { publicQuery } from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import { notFound, publicRoute } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export const GET = publicRoute<{ id: string }>(async (_req, { id }) => {
  const { isOwn: _isOwn, ...group } = await publicQuery(
    api.timelineGroup.getById,
    { id: id as Id<"timelineGroup"> },
  );

  if (group.visibility !== "public") {
    throw notFound("Timeline group not found.");
  }

  return ok(toResource(group), { cache: "shared" });
});
