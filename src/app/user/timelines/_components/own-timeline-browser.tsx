"use client";

import { OwnTimelineEntry } from "@/app/user/timelines/_components/own-timeline-entry";
import { MessageBox } from "@/components/common/message-box";
import { useQueryWithStatus } from "@/lib/convex";
import type { Student } from "@prisma/client";
import { api } from "~convex/api";

export type OwnTimelineBrowserProps = {
  allStudents: Student[];
};

export function OwnTimelineBrowser({ allStudents }: OwnTimelineBrowserProps) {
  const query = useQueryWithStatus(api.timeline.getOwn);

  if (query.status === "pending") {
    return <MessageBox>Loading...</MessageBox>;
  }

  if (query.status === "error") {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        Failed to load timelines.
      </MessageBox>
    );
  }

  if (query.status === "success" && query.data.length === 0) {
    return (
      <MessageBox>
        <p>You have no timelines saved.</p>
      </MessageBox>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {query.data.map((entry) => (
        <OwnTimelineEntry
          key={entry._id}
          allStudents={allStudents}
          entry={entry}
        />
      ))}
    </div>
  );
}
