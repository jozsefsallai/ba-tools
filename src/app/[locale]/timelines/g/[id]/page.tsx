import { TimelineGroupView } from "@/app/[locale]/timelines/g/_components/timeline-group-view";
import { redirect } from "@/i18n/navigation";
import { getPublicTimelineMetadata } from "@/lib/og/public-timeline.server";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import type { Id } from "~convex/dataModel";

type PageParams = {
  id: Id<"timelineGroup">;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  try {
    const { id } = await params;

    return await getPublicTimelineMetadata(
      "timeline-group",
      id,
      await getLocale(),
    );
  } catch (err) {
    return redirect({ href: "/404", locale: await getLocale() });
  }
}

export default async function TimelineGroupPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { id } = await params;

  return <TimelineGroupView id={id} />;
}
