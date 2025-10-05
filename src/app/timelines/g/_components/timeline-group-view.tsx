"use client";

import { TimelineGroupEntry } from "@/app/timelines/g/_components/timeline-group-entry";
import { MessageBox } from "@/components/common/message-box";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQueryWithStatus } from "@/lib/convex";
import type { Student } from "@prisma/client";
import Markdown from "react-markdown";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export type TimelineGroupViewProps = {
  id: Id<"timelineGroup">;
  allStudents: Student[];
};

export function TimelineGroupView({ id, allStudents }: TimelineGroupViewProps) {
  const query = useQueryWithStatus(api.timelineGroup.getById, { id });

  if (query.status === "pending") {
    return <MessageBox>Loading timeline group...</MessageBox>;
  }

  if (query.status === "error") {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        Failed to load timeline group.
      </MessageBox>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">{query.data.name}</h1>

          {"user" in query.data && query.data.showCreator && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>Created by</span>

              <Avatar className="size-6">
                <AvatarFallback>
                  {(query.data.user.name ?? query.data.user.username)[0]}
                </AvatarFallback>

                <AvatarImage src={query.data.user.avatar} />
              </Avatar>

              <span className="font-bold">
                {query.data.user.name ??
                  query.data.user.username ??
                  "Unknown User"}
              </span>
            </div>
          )}
        </div>

        {query.data.description && (
          <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:mt-4 max-w-none">
            <Markdown>{query.data.description}</Markdown>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold">Timelines</h2>

        {query.data.timelines.length === 0 ? (
          <MessageBox>This group has no timelines.</MessageBox>
        ) : (
          <div className="flex flex-col gap-4">
            {query.data.timelines.map((timeline) => (
              <TimelineGroupEntry
                key={timeline._id}
                entry={timeline}
                allStudents={allStudents}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
