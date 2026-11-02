import { createGiftTarget } from "@/lib/public-api/resources/gift-inventories.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";

type Params = { id: string };

export const POST = userRoute<Params>(async (req, { id }, userId) => {
  return ok(await createGiftTarget(userId, id, await readJsonObject(req)), {
    cache: "private",
    status: 201,
  });
});
