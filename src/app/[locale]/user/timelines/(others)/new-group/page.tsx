import { CreateTimelineGroup } from "@/app/[locale]/user/timelines/_components/create-timeline-group";
import { auth } from "@clerk/nextjs/server";

export default async function NewTimelineGroupPage() {
  await auth.protect();
  return <CreateTimelineGroup />;
}
