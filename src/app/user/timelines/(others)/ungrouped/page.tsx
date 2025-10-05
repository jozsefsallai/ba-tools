import { OwnTimelineBrowser } from "@/app/user/timelines/_components/own-timeline-browser";
import { db } from "@/lib/db";

export default async function UngroupedTimelinesPage() {
  const allStudents = await db.student.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return <OwnTimelineBrowser allStudents={allStudents} />;
}
