import { z } from "zod";
import {
  createPvpMatch,
  listPvpMatches,
} from "@/lib/public-api/resources/pvp.server";
import { ok } from "@/lib/public-api/response";
import { parseQuery, readJsonObject, userRoute } from "@/lib/public-api/route";

type Params = {
  seasonId: string;
};

const querySchema = z.object({
  from: z.coerce.number().int().optional(),
  to: z.coerce.number().int().optional(),
});

export const GET = userRoute<Params>(async (req, { seasonId }, userId) => {
  return ok(
    await listPvpMatches(userId, seasonId, parseQuery(req, querySchema)),
    {
      cache: "private",
    },
  );
});

export const POST = userRoute<Params>(async (req, { seasonId }, userId) => {
  return ok(await createPvpMatch(userId, seasonId, await readJsonObject(req)), {
    cache: "private",
    status: 201,
  });
});
