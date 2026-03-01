"use client";

import { OwnTimelineEntry } from "@/app/user/timelines/_components/own-timeline-entry";
import { MessageBox } from "@/components/common/message-box";
import { useQueryWithStatus } from "@/lib/convex";
import { useTranslations } from "next-intl";
import { api } from "~convex/api";

export function OwnTimelineBrowser() {
  const t = useTranslations();
  const query = useQueryWithStatus(api.timeline.getOwn);

  if (query.status === "pending") {
    return <MessageBox>{t("common.loading")}</MessageBox>;
  }

  if (query.status === "error") {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        {t("tools.myTimelines.ownTimelineBrowser.failedToLoad")}
      </MessageBox>
    );
  }

  if (query.status === "success" && query.data.length === 0) {
    return (
      <MessageBox>
        <p>{t("tools.myTimelines.ownTimelineBrowser.noTimelines")}</p>
      </MessageBox>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {query.data.map((entry) => (
        <OwnTimelineEntry key={entry._id} entry={entry} />
      ))}
    </div>
  );
}
