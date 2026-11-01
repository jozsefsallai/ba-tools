import { publicQuery } from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import { publicRoute } from "@/lib/public-api/route";
import { api } from "~convex/api";

export const GET = publicRoute(async () => {
  const status = await publicQuery(api.pvpStats.getStatus, {});

  return ok(
    {
      isUpdating: status?.isUpdating ?? false,
      lastCompletedAt: status?.lastCompletedAt ?? null,
      nextExpectedAt: status?.nextExpectedAt ?? null,
    },
    { cache: "public" },
  );
});
