import { getMe } from "@/lib/public-api/resources/account.server";
import { ok } from "@/lib/public-api/response";
import { userRoute } from "@/lib/public-api/route";

export const GET = userRoute(async (_req, _params, userId) => {
  return ok(await getMe(userId), {
    cache: "private",
  });
});
