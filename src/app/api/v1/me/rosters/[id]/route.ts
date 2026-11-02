import {
  deleteRoster,
  getRoster,
  updateRoster,
} from "@/lib/public-api/resources/rosters.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";

type Params = {
  id: string;
};

export const GET = userRoute<Params>(async (_req, { id }, userId) => {
  return ok(await getRoster(userId, id), {
    cache: "private",
  });
});

export const PATCH = userRoute<Params>(async (req, { id }, userId) => {
  return ok(await updateRoster(userId, id, await readJsonObject(req)), {
    cache: "private",
  });
});

export const DELETE = userRoute<Params>(async (_req, { id }, userId) => {
  await deleteRoster(userId, id);
  return new Response(null, {
    status: 204,
  });
});
