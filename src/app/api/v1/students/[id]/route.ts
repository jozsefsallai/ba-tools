import {
  getStudentDetails,
  studentMediaUrls,
} from "@/lib/data/students.server";
import { ok } from "@/lib/public-api/response";
import { notFound, publicRoute } from "@/lib/public-api/route";

export const GET = publicRoute<{ id: string }>(async (_req, { id }) => {
  const student = await getStudentDetails(id);
  if (!student) {
    throw notFound("Student not found.");
  }

  return ok(
    {
      ...student,
      ...studentMediaUrls(student.id),
    },
    { cache: "public" },
  );
});
