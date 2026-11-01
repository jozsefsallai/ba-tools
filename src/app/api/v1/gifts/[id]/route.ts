import { getGift } from "@/lib/data/gifts.server";
import { ok } from "@/lib/public-api/response";
import { notFound, publicRoute } from "@/lib/public-api/route";
import { buildItemIconUrl } from "@/lib/url";

export const GET = publicRoute<{ id: string }>(async (_req, { id }) => {
  const giftId = Number(id);
  const gift = Number.isSafeInteger(giftId) ? await getGift(giftId) : null;
  if (!gift) {
    throw notFound("Gift not found.");
  }

  return ok(
    { ...gift, iconUrl: buildItemIconUrl(gift.iconName) },
    { cache: "public" },
  );
});
