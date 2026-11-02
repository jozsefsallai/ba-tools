import {
  listPvpTeams,
  pvpTeamsSchema,
} from "@/lib/public-api/resources/pvp-stats.server";
import { okPage } from "@/lib/public-api/response";
import {
  parsePagination,
  parseQuery,
  publicRoute,
} from "@/lib/public-api/route";
import { z } from "zod";

const querySchema = pvpTeamsSchema.extend({
  exclude: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        : [],
    ),
});

export const GET = publicRoute(async (req) => {
  return okPage(
    await listPvpTeams(parseQuery(req, querySchema), parsePagination(req)),
    { cache: "public" },
  );
});
