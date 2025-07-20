"use client";

import { OwnTimelineEntry } from "@/app/user/timelines/_components/own-timeline-entry";
import { useQueryWithStatus } from "@/lib/convex";
import type { Student } from "@prisma/client";
import { api } from "~convex/api";

export type OwnTimelineBrowserProps = {
  allStudents: Student[];
};

export function OwnTimelineBrowser({ allStudents }: OwnTimelineBrowserProps) {
  const query = useQueryWithStatus(api.timeline.getOwn);

  if (query.status === "pending") {
    return (
      <div className="border rounded-md px-4 py-10 text-center text-xl text-muted-foreground">
        <p>Loading...</p>
      </div>
    );
  }

  if (query.status === "error") {
    return (
      <div className="border border-destructive bg-destructive/10 rounded-md px-4 py-10 text-center text-xl">
        Failed to load timelines.
      </div>
    );
  }

  if (query.status === "success" && query.data.length === 0) {
    return (
      <div className="border rounded-md px-4 py-10 text-center text-xl text-muted-foreground">
        <p>You have no timelines saved.</p>
      </div>
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
