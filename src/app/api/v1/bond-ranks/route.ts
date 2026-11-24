import {
  bondRanksSchema,
  listBondRanks,
} from "@/lib/public-api/resources/game-data.server";
import { ok } from "@/lib/public-api/response";
import { parseQuery, publicRoute } from "@/lib/public-api/route";

export const GET = publicRoute(async (req) => {
  return ok(listBondRanks(parseQuery(req, bondRanksSchema)), {
    cache: "public",
  });
});
