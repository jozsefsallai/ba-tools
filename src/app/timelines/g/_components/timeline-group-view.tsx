"use client";

import { TimelineGroupEntry } from "@/app/timelines/g/_components/timeline-group-entry";
import { MarkdownRenderer } from "@/components/common/markdown-renderer";
import { MessageBox } from "@/components/common/message-box";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useQueryWithStatus } from "@/lib/convex";
import { PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export type TimelineGroupViewProps = {
  id: Id<"timelineGroup">;
};

export function TimelineGroupView({ id }: TimelineGroupViewProps) {
  const t = useTranslations();
  const query = useQueryWithStatus(api.timelineGroup.getById, { id });

  if (query.status === "pending") {
    return <MessageBox>{t("tools.timelineGroupView.loadingGroup")}</MessageBox>;
  }

  if (query.status === "error") {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        {t("tools.timelineGroupView.failedToLoad")}
      </MessageBox>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 justify-between">
            <h1 className="text-3xl font-bold">{query.data.name}</h1>

            {query.data.isOwn && (
              <Button variant="outline" asChild>
                <Link href={`/user/timelines/${id}`}>
                  <PencilIcon /> {t("tools.timelineGroupView.editGroup")}
                </Link>
              </Button>
            )}
          </div>

          {"user" in query.data && query.data.showCreator && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>{t("common.createdBy")}</span>

              <Avatar className="size-6">
                <AvatarFallback>
                  {(query.data.user.name ?? query.data.user.username)[0]}
                </AvatarFallback>

                <AvatarImage src={query.data.user.avatar} />
              </Avatar>

              <span className="font-bold">
                {query.data.user.name ??
                  query.data.user.username ??
                  t("common.unknownUser")}
              </span>
            </div>
          )}
        </div>

        {query.data.description && (
          <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:mt-4 max-w-none">
            <MarkdownRenderer>{query.data.description}</MarkdownRenderer>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold">{t("tools.timelineGroupView.timelines")}</h2>

        {query.data.timelines.length === 0 ? (
          <MessageBox>{t("tools.timelineGroupView.noTimelines")}</MessageBox>
        ) : (
          <div className="flex flex-col gap-4">
            {query.data.timelines.map((timeline) => (
              <TimelineGroupEntry key={timeline._id} entry={timeline} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
