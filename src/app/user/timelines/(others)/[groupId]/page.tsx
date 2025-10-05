import { TimelineGroupView } from "@/app/user/timelines/_components/timeline-group-view";
import { db } from "@/lib/db";
import type { Id } from "~convex/dataModel";

export default async function TimelineGroupPage({
  params,
}: {
  params: Promise<{ groupId: Id<"timelineGroup"> }>;
}) {
  const { groupId } = await params;

  const allStudents = await db.student.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return <TimelineGroupView allStudents={allStudents} groupId={groupId} />;
}
