import {
  deleteGiftInventory,
  getGiftInventory,
  updateGiftInventory,
} from "@/lib/public-api/resources/gift-inventories.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";

type Params = { id: string };

export const GET = userRoute<Params>(async (_req, { id }, userId) => {
  return ok(await getGiftInventory(userId, id), { cache: "private" });
});

export const PATCH = userRoute<Params>(async (req, { id }, userId) => {
  return ok(await updateGiftInventory(userId, id, await readJsonObject(req)), {
    cache: "private",
  });
});

export const DELETE = userRoute<Params>(async (_req, { id }, userId) => {
  await deleteGiftInventory(userId, id);
  return new Response(null, { status: 204 });
});
