import {
  deleteGiftTarget,
  getGiftTarget,
  updateGiftTarget,
} from "@/lib/public-api/resources/gift-inventories.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";

type Params = { id: string; targetId: string };

export const GET = userRoute<Params>(async (_req, { id, targetId }, userId) => {
  return ok(await getGiftTarget(userId, id, targetId), { cache: "private" });
});

export const PATCH = userRoute<Params>(
  async (req, { id, targetId }, userId) => {
    return ok(
      await updateGiftTarget(userId, id, targetId, await readJsonObject(req)),
      {
        cache: "private",
      },
    );
  },
);

export const DELETE = userRoute<Params>(
  async (_req, { id, targetId }, userId) => {
    await deleteGiftTarget(userId, id, targetId);
    return new Response(null, { status: 204 });
  },
);
