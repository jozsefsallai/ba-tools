import { auth } from "@clerk/nextjs/server";
import { OwnTimelineBrowser } from "@/app/[locale]/user/timelines/_components/own-timeline-browser";

export default async function UngroupedTimelinesPage() {
  await auth.protect();
  return <OwnTimelineBrowser />;
}
