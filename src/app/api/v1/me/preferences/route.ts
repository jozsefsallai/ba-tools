import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";

export const GET = userRoute(async (_req, _params, userId) => {
  return ok(toResource(await userQuery(userId, api.userPreferences.get, {})), {
    cache: "private",
  });
});

export const PATCH = userRoute(async (req, _params, userId) => {
  const body = await readJsonObject(req);

  const preferences = await userMutation(
    userId,
    api.userPreferences.update,
    body as UserArgs<typeof api.userPreferences.update>,
  );

  return ok(toResource(preferences), { cache: "private" });
});
