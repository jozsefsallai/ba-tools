import {
  createRoster,
  listRosters,
} from "@/lib/public-api/resources/rosters.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";

export const GET = userRoute(async (_req, _params, userId) => {
  return ok(await listRosters(userId), {
    cache: "private",
  });
});

export const POST = userRoute(async (req, _params, userId) => {
  return ok(await createRoster(userId, await readJsonObject(req)), {
    cache: "private",
    status: 201,
  });
});
