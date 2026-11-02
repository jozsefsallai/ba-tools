import { auth } from "@clerk/nextjs/server";
import { OwnTimelineGroupsBrowser } from "@/app/[locale]/user/timelines/_components/own-timeline-groups-browser";

export default async function MyTimelinesPage() {
  await auth.protect();
  return <OwnTimelineGroupsBrowser />;
}
