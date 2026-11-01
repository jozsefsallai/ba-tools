import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { ok, okPage } from "@/lib/public-api/response";
import {
  parsePagination,
  readJsonObject,
  userRoute,
} from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";

export const GET = userRoute(async (req, _params, userId) => {
  const result = await userQuery(userId, api.timelineGroup.getOwnPaginated, {
    paginationOpts: parsePagination(req),
  });

  return okPage(result, { cache: "private" });
});

export const POST = userRoute(async (req, _params, userId) => {
  const body = await readJsonObject(req);

  const id = await userMutation(
    userId,
    api.timelineGroup.create,
    body as UserArgs<typeof api.timelineGroup.create>,
  );

  const group = await userQuery(userId, api.timelineGroup.getOwnById, { id });

  return ok(toResource(group), { cache: "private", status: 201 });
});
