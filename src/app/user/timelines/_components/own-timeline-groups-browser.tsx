"use client";

import { MessageBox } from "@/components/common/message-box";
import { useQueryWithStatus } from "@/lib/convex";
import Link from "next/link";
import { useMemo } from "react";
import { api } from "~convex/api";
import type { Doc } from "~convex/dataModel";

export function OwnTimelineGroupsBrowser() {
  const query = useQueryWithStatus(api.timelineGroup.getOwn);

  const timelineGroups = useMemo<Doc<"timelineGroup">[]>(() => {
    const ungrouped: Doc<"timelineGroup"> = {
      _id: "ungrouped" as any,
      name: "All Timelines",
      description: "All timelines you have created.",
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
  }, [query]);

  if (query.status === "pending") {
    return <MessageBox>Loading...</MessageBox>;
  }

  if (query.status === "error") {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        Failed to load timeline groups.
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
                ? "This group contains all your timelines."
                : `This group contains ${group.timelines.length} timeline${
                    group.timelines.length !== 1 ? "s" : ""
                  }.`}
            </p>

            <p className="text-xs text-muted-foreground">
              <strong>Visibility:</strong>{" "}
              {group.visibility === "private" ? "Private" : "Public"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
