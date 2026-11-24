import { z } from "zod";
import {
  calculateRaidScore,
  raidScoreSchema,
} from "@/lib/public-api/resources/calculators.server";
import { ok } from "@/lib/public-api/response";
import { parseQuery, publicRoute } from "@/lib/public-api/route";

const querySchema = raidScoreSchema.extend({
  clearTimes: z
    .string()
    .optional()
    .transform((value) => value?.split(","))
    .pipe(raidScoreSchema.shape.clearTimes),
});

export const GET = publicRoute(async (req) => {
  return ok(calculateRaidScore(parseQuery(req, querySchema)), {
    cache: "public",
  });
});
