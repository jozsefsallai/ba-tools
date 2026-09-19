import { OwnTimelineGroupsBrowser } from "@/app/user/timelines/_components/own-timeline-groups-browser";
import { auth } from "@clerk/nextjs/server";

export default async function MyTimelinesPage() {
  await auth.protect();
  return <OwnTimelineGroupsBrowser />;
}
