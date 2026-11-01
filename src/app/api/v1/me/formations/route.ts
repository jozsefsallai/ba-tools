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
  const result = await userQuery(userId, api.formation.getOwnPaginated, {
    paginationOpts: parsePagination(req),
  });

  return okPage(result, { cache: "private" });
});

export const POST = userRoute(async (req, _params, userId) => {
  const body = await readJsonObject(req);

  const formation = await userMutation(
    userId,
    api.formation.create,
    body as UserArgs<typeof api.formation.create>,
  );

  return ok(toResource(formation), { cache: "private", status: 201 });
});
