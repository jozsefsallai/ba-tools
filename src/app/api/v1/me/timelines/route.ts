import {
  createTimeline,
  listTimelines,
} from "@/lib/public-api/resources/timelines.server";
import { ok, okPage } from "@/lib/public-api/response";
import {
  parsePagination,
  readJsonObject,
  userRoute,
} from "@/lib/public-api/route";

export const GET = userRoute(async (req, _params, userId) => {
  return okPage(await listTimelines(userId, parsePagination(req)), {
    cache: "private",
  });
});

export const POST = userRoute(async (req, _params, userId) => {
  return ok(await createTimeline(userId, await readJsonObject(req)), {
    cache: "private",
    status: 201,
  });
});
