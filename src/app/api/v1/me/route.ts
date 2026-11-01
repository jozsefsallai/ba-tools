import { userQuery } from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import { userRoute } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";

export const GET = userRoute(async (_req, _params, userId) => {
  return ok(toResource(await userQuery(userId, api.users.getMe, {})), {
    cache: "private",
  });
});
