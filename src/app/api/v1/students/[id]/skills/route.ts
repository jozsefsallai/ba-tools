import { getStudentSkills } from "@/lib/data/student-skills.server";
import { ok } from "@/lib/public-api/response";
import { notFound, parseQuery, publicRoute } from "@/lib/public-api/route";
import { resolveStudentIdentifier } from "@/lib/student-resolve.server";
import { z } from "zod";

const querySchema = z.object({
  locale: z.enum(["en", "ja"]).default("en"),
});

export const GET = publicRoute<{ id: string }>(async (req, { id }) => {
  const { locale } = parseQuery(req, querySchema);

  const resolved = await resolveStudentIdentifier(id);
  if (!resolved) {
    throw notFound("Student not found.");
  }

  return ok(await getStudentSkills(resolved.id, locale), { cache: "public" });
});
