import {
  createGiftInventory,
  listGiftInventories,
} from "@/lib/public-api/resources/gift-inventories.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";

export const GET = userRoute(async (_req, _params, userId) => {
  return ok(await listGiftInventories(userId), {
    cache: "private",
  });
});

export const POST = userRoute(async (req, _params, userId) => {
  return ok(await createGiftInventory(userId, await readJsonObject(req)), {
    cache: "private",
    status: 201,
  });
});
