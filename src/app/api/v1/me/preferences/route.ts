import {
  getPreferences,
  updatePreferences,
} from "@/lib/public-api/resources/account.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";

export const GET = userRoute(async (_req, _params, userId) => {
  return ok(await getPreferences(userId), { cache: "private" });
});

export const PATCH = userRoute(async (req, _params, userId) => {
  return ok(await updatePreferences(userId, await readJsonObject(req)), {
    cache: "private",
  });
});
