import { searchGifts } from "@/lib/data/gifts.server";
import { ok } from "@/lib/public-api/response";
import { parseQuery, publicRoute } from "@/lib/public-api/route";
import { buildItemIconUrl } from "@/lib/url";
import { z } from "zod";

const querySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const GET = publicRoute(async (req) => {
  const { q, limit } = parseQuery(req, querySchema);
  const gifts = await searchGifts({ query: q, limit });

  return ok(
    gifts.map((gift) => ({
      ...gift,
      iconUrl: buildItemIconUrl(gift.iconName),
    })),
    { cache: "public" },
  );
});
