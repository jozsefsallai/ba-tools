import {
  searchSlotSchema,
  seasonNumberSchema,
} from "@/app/api/v1/pvp/stats/_lib/schemas";
import { publicQuery } from "@/lib/public-api/convex.server";
import { okPage } from "@/lib/public-api/response";
import {
  parseBody,
  parsePagination,
  publicRoute,
} from "@/lib/public-api/route";
import { z } from "zod";
import { api } from "~convex/api";

const bodySchema = z.object({
  season: seasonNumberSchema,
  defenseTeam: z.array(searchSlotSchema).max(6),
  excludedStudentIds: z.array(z.string()).default([]),
  matchMode: z.enum(["primary", "similar"]).optional(),
  excludeDefenseTeam: z.array(searchSlotSchema).max(6).optional(),
});

export const POST = publicRoute(async (req) => {
  const { season, ...input } = await parseBody(req, bodySchema);

  const result = await publicQuery(api.pvpStats.search, {
    ...input,
    seasonNumber: season,
    paginationOpts: parsePagination(req),
  });

  return okPage(result, { cache: "private" });
});
