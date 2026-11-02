import { getGift } from "@/lib/public-api/resources/game-data.server";
import { ok } from "@/lib/public-api/response";
import { publicRoute } from "@/lib/public-api/route";

export const GET = publicRoute<{ id: string }>(async (_req, { id }) => {
  return ok(await getGift(id), { cache: "public" });
});
