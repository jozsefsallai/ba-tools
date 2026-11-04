import { auth } from "@clerk/nextjs/server";
import { CreateTimelineGroup } from "@/app/[locale]/user/timelines/_components/create-timeline-group";
import { getRoadmapRaids } from "@/lib/roadmap/roadmap.server";

export default async function NewTimelineGroupPage() {
  await auth.protect();
  const roadmapRaids = await getRoadmapRaids();

  return <CreateTimelineGroup roadmapRaids={roadmapRaids} />;
}
