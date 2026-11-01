import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import {
  mergeForUpdate,
  readJsonObject,
  userRoute,
} from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

type Params = { id: string };

const UPDATE_KEYS = [
  "name",
  "type",
  "strikers",
  "specials",
  "rows",
  "rowGap",
  "displayOverline",
  "noDisplayRole",
  "groupsVertical",
] as const;

export const GET = userRoute<Params>(async (_req, { id }, userId) => {
  const formation = await userQuery(userId, api.formation.getById, {
    id: id as Id<"formation">,
  });

  return ok(toResource(formation), { cache: "private" });
});

export const PATCH = userRoute<Params>(async (req, { id }, userId) => {
  const body = await readJsonObject(req);

  const current = await userQuery(userId, api.formation.getById, {
    id: id as Id<"formation">,
  });

  const formation = await userMutation(userId, api.formation.update, {
    ...mergeForUpdate(current, UPDATE_KEYS, body),
    id: current._id,
  } as UserArgs<typeof api.formation.update>);

  return ok(toResource(formation), { cache: "private" });
});

export const DELETE = userRoute<Params>(async (_req, { id }, userId) => {
  await userMutation(userId, api.formation.destroy, {
    id: id as Id<"formation">,
  });

  return new Response(null, { status: 204 });
});
