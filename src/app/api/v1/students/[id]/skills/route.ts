import {
  getStudentSkills,
  studentSkillsSchema,
} from "@/lib/public-api/resources/game-data.server";
import { ok } from "@/lib/public-api/response";
import { parseQuery, publicRoute } from "@/lib/public-api/route";

export const GET = publicRoute<{
  id: string;
}>(async (req, { id }) => {
  return ok(await getStudentSkills(id, parseQuery(req, studentSkillsSchema)), {
    cache: "public",
  });
});
