import {
  pvpStatsSearchSchema,
  searchPvpStats,
} from "@/lib/public-api/resources/pvp-stats.server";
import { okPage } from "@/lib/public-api/response";
import {
  parseBody,
  parsePagination,
  publicRoute,
} from "@/lib/public-api/route";

export const POST = publicRoute(
  async (req) => {
    return okPage(
      await searchPvpStats(
        await parseBody(req, pvpStatsSearchSchema),
        parsePagination(req),
      ),
      { cache: "private" },
    );
  },
  { rateLimit: "search" },
);
