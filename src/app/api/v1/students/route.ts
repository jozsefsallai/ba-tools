import {
  listStudents,
  studentSearchSchema,
} from "@/lib/public-api/resources/game-data.server";
import { ok } from "@/lib/public-api/response";
import { parseQuery, publicRoute } from "@/lib/public-api/route";

export const GET = publicRoute(async (req) => {
  return ok(await listStudents(parseQuery(req, studentSearchSchema)), {
    cache: "public",
  });
});
