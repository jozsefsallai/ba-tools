import { TimelineGroupView } from "@/app/[locale]/timelines/g/_components/timeline-group-view";
import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";
import removeMD from "remove-markdown";
import { truncateText } from "@/lib/text-utils";
import { redirect } from "@/i18n/navigation";

type PageParams = {
  id: Id<"timelineGroup">;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  try {
    const t = await getTranslations();
    const { id } = await params;

    const timelineGroup = await fetchQuery(api.timelineGroup.getById, {
      id,
    });

    const description = timelineGroup.description
      ? truncateText(
          removeMD(timelineGroup.description)
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0)
            .join(" "),
          160,
        )
      : t("tools.timelineGroupView.defaultDescription");

    return {
      title: `${timelineGroup.name ?? t("common.untitledTimelineGroup")} - ${t("common.appName")}`,
      description,
      twitter: {
        card: "summary",
      },
    };
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
