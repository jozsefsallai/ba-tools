import { TimelineGroupView } from "@/app/user/timelines/_components/timeline-group-view";
import type { Id } from "~convex/dataModel";

export default async function TimelineGroupPage({
  params,
}: {
  params: Promise<{ groupId: Id<"timelineGroup"> }>;
}) {
  const { groupId } = await params;

  return <TimelineGroupView groupId={groupId} />;
}
