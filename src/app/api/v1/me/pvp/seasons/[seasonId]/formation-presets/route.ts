import {
  createPvpFormationPreset,
  listPvpFormationPresets,
} from "@/lib/public-api/resources/pvp.server";
import { ok } from "@/lib/public-api/response";
import { parseQuery, readJsonObject, userRoute } from "@/lib/public-api/route";
import { z } from "zod";

type Params = { seasonId: string };

const querySchema = z.object({ search: z.string().optional() });

export const GET = userRoute<Params>(async (req, { seasonId }, userId) => {
  return ok(
    await listPvpFormationPresets(
      userId,
      seasonId,
      parseQuery(req, querySchema),
    ),
    { cache: "private" },
  );
});

export const POST = userRoute<Params>(async (req, { seasonId }, userId) => {
  return ok(
    await createPvpFormationPreset(userId, seasonId, await readJsonObject(req)),
    { cache: "private", status: 201 },
  );
});
