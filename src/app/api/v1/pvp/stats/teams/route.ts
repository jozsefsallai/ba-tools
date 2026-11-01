import {
  seasonNumberSchema,
  studentIdListSchema,
} from "@/app/api/v1/pvp/stats/_lib/schemas";
import { publicQuery } from "@/lib/public-api/convex.server";
import { ApiError, okPage } from "@/lib/public-api/response";
import {
  parsePagination,
  parseQuery,
  publicRoute,
} from "@/lib/public-api/route";
import { z } from "zod";
import { api } from "~convex/api";

const querySchema = z.object({
  season: seasonNumberSchema,
  role: z.enum(["attack", "defense"]),
  minimumBattles: z.coerce.number().int().min(1).default(10),
  sort: z
    .enum(["confidence", "winRateDesc", "winRateAsc", "battles"])
    .default("confidence"),
  exclude: studentIdListSchema,
});

export const GET = publicRoute(async (req) => {
  const { season, role, minimumBattles, sort, exclude } = parseQuery(
    req,
    querySchema,
  );

  const snapshot = await publicQuery(api.pvpStats.getRankingsSnapshot, {});
  if (!snapshot) {
    throw new ApiError("NOT_FOUND", "Team rankings are not available yet.");
  }

  const result = await publicQuery(api.pvpStats.listEffectiveTeams, {
    snapshot,
    seasonNumber: season,
    role,
    minimumBattles,
    sort,
    excludedStudentIds: exclude,
    paginationOpts: parsePagination(req),
  });

  return okPage(result, { cache: "public" });
});
