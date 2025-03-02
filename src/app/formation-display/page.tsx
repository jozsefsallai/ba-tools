import { FormationEditor } from "@/app/formation-display/_components/formation-editor";
import { db } from "@/lib/db";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Formation Display - Joe's Blue Archive Tools",
  description:
    "Generate an image of a student formation. Useful for things like YouTube thumbnails.",
};

export default async function FormationDisplayPage() {
  const allStudents = await db.students.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <h1 className="text-xl font-bold">Formation Display</h1>
        <p>
          This tool allows you to generate an image of a student formation. This
          can be useful for cases such as designing clean YouTube thumbnails.
        </p>
      </div>

      <FormationEditor allStudents={allStudents} />
    </div>
  );
}
