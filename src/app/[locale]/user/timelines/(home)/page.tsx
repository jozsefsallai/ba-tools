import { OwnTimelineGroupsBrowser } from "@/app/[locale]/user/timelines/_components/own-timeline-groups-browser";
import { auth } from "@clerk/nextjs/server";

export default async function MyTimelinesPage() {
  await auth.protect();
  return <OwnTimelineGroupsBrowser />;
}
