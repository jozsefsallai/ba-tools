import { z } from "zod";
import {
  createPvpEnemyPreset,
  listPvpEnemyPresets,
} from "@/lib/public-api/resources/pvp.server";
import { ok, okPage } from "@/lib/public-api/response";
import {
  parsePagination,
  parseQuery,
  readJsonObject,
  userRoute,
} from "@/lib/public-api/route";

type Params = {
  seasonId: string;
};

const querySchema = z.object({
  search: z.string().optional(),
});

export const GET = userRoute<Params>(async (req, { seasonId }, userId) => {
  return okPage(
    await listPvpEnemyPresets(
      userId,
      seasonId,
      parseQuery(req, querySchema),
      parsePagination(req),
    ),
    {
      cache: "private",
    },
  );
});

export const POST = userRoute<Params>(async (req, { seasonId }, userId) => {
  return ok(
    await createPvpEnemyPreset(userId, seasonId, await readJsonObject(req)),
    {
      cache: "private",
      status: 201,
    },
  );
});
