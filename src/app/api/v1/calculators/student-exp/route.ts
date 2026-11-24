import {
  calculateStudentExp,
  studentExpSchema,
} from "@/lib/public-api/resources/calculators.server";
import { ok } from "@/lib/public-api/response";
import { parseQuery, publicRoute } from "@/lib/public-api/route";

export const GET = publicRoute(async (req) => {
  return ok(calculateStudentExp(parseQuery(req, studentExpSchema)), {
    cache: "public",
  });
});
