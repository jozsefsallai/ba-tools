import { TimelineGroupView } from "@/app/user/timelines/_components/timeline-group-view";
import { auth } from "@clerk/nextjs/server";
import type { Id } from "~convex/dataModel";

export default async function TimelineGroupPage({
  params,
}: {
  params: Promise<{ groupId: Id<"timelineGroup"> }>;
}) {
  await auth.protect();
  const { groupId } = await params;

  return <TimelineGroupView groupId={groupId} />;
}
