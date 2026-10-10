import { TimelineView } from "@/app/[locale]/timelines/[id]/_components/timeline-view";
import { redirect } from "@/i18n/navigation";
import { getPublicTimelineMetadata } from "@/lib/og/public-timeline.server";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

type PageParams = {
  id: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  try {
    const { id } = await params;

    return await getPublicTimelineMetadata("timeline", id, await getLocale());
  } catch (err) {
    return redirect({ href: "/404", locale: await getLocale() });
  }
}

export default async function TimelinePage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { id } = await params;

  return <TimelineView id={id} />;
}
