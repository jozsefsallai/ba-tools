import { auth } from "@clerk/nextjs/server";
import { TimelineGroupView } from "@/app/[locale]/user/timelines/_components/timeline-group-view";
import { getRoadmapRaids } from "@/lib/roadmap/roadmap.server";
import type { Id } from "~convex/dataModel";

export default async function TimelineGroupPage({
  params,
}: {
  params: Promise<{
    groupId: Id<"timelineGroup">;
  }>;
}) {
  await auth.protect();
  const { groupId } = await params;

  const roadmapRaids = await getRoadmapRaids();

  return <TimelineGroupView groupId={groupId} roadmapRaids={roadmapRaids} />;
}
