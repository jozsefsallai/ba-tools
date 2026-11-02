import { auth } from "@clerk/nextjs/server";
import { CreateTimelineGroup } from "@/app/[locale]/user/timelines/_components/create-timeline-group";

export default async function NewTimelineGroupPage() {
  await auth.protect();
  return <CreateTimelineGroup />;
}
