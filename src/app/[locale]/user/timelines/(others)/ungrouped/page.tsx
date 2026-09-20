import { OwnTimelineBrowser } from "@/app/[locale]/user/timelines/_components/own-timeline-browser";
import { auth } from "@clerk/nextjs/server";

export default async function UngroupedTimelinesPage() {
  await auth.protect();
  return <OwnTimelineBrowser />;
}
