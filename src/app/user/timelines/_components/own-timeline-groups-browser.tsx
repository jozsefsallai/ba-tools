"use client";

import { MessageBox } from "@/components/common/message-box";
import { useQueryWithStatus } from "@/lib/convex";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { api } from "~convex/api";
import type { Doc } from "~convex/dataModel";

export function OwnTimelineGroupsBrowser() {
  const t = useTranslations();
  const query = useQueryWithStatus(api.timelineGroup.getOwn);

  const timelineGroups = useMemo<Doc<"timelineGroup">[]>(() => {
    const ungrouped: Doc<"timelineGroup"> = {
      _id: "ungrouped" as any,
      name: t("tools.myTimelines.allTimelines"),
      description: t("tools.myTimelines.allTimelinesDescription"),
      visibility: "private" as const,
      showCreator: false,
      userId: "system" as any,
      timelines: [],
      _creationTime: new Date().getTime(),
    };

    if (query.status === "success") {
      return [ungrouped, ...query.data];
    }

    return [ungrouped];
  }, [query, t]);

  if (query.status === "pending") {
    return <MessageBox>{t("common.loading")}</MessageBox>;
  }

  if (query.status === "error") {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        {t("tools.myTimelines.failedToLoad")}
      </MessageBox>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {timelineGroups.map((group) => (
        <Link href={`/user/timelines/${group._id}`} key={group._id}>
          <div
            key={group._id}
            className="h-full flex flex-col gap-2 border rounded-md p-4 hover:bg-accent relative"
          >
            <h2 className="text-lg font-bold">{group.name}</h2>

            <p className="text-sm text-muted-foreground">
              {group._id === "ungrouped"
                ? t("tools.myTimelines.allTimelinesGroupDescription")
                : t("tools.myTimelines.groupContains", { count: group.timelines.length })}
            </p>

            <p className="text-xs text-muted-foreground">
              <strong>{`${t("common.visibility")}:`}</strong>{" "}
              {group.visibility === "private" ? t("common.private") : t("common.public")}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
