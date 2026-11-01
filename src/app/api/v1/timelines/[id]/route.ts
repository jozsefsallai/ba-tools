import { publicQuery } from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import { notFound, publicRoute } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export const GET = publicRoute<{ id: string }>(async (_req, { id }) => {
  const { isOwn: _isOwn, ...timeline } = await publicQuery(
    api.timeline.getById,
    {
      id: id as Id<"timeline">,
    },
  );

  if (timeline.visibility !== "public") {
    throw notFound("Timeline not found.");
  }

  return ok(toResource(timeline), { cache: "shared" });
});
