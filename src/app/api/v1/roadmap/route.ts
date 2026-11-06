import { z } from "zod";
import {
  getRoadmap,
  roadmapSchema,
} from "@/lib/public-api/resources/game-data.server";
import { ok } from "@/lib/public-api/response";
import { parseQuery, publicRoute } from "@/lib/public-api/route";

const querySchema = roadmapSchema.extend({
  categories: z
    .string()
    .optional()
    .transform((value) =>
      value
        ?.split(",")
        .map((category) => category.trim())
        .filter(Boolean),
    )
    .pipe(roadmapSchema.shape.categories),
});

export const GET = publicRoute(async (req) => {
  return ok(await getRoadmap(parseQuery(req, querySchema)), {
    cache: "public",
  });
});
