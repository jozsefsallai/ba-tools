"use client";

import { OwnRostersBrowserItem } from "@/app/user/rosters/_components/own-rosters-browser-item";
import { MessageBox } from "@/components/common/message-box";
import { useQueryWithStatus } from "@/lib/convex";
import Link from "next/link";
import { api } from "~convex/api";

export function OwnRostersBrowser() {
  const query = useQueryWithStatus(api.roster.getOwn);

  if (query.status === "pending") {
    return <MessageBox>Loading...</MessageBox>;
  }

  if (query.status === "error") {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        Failed to load rosters.
      </MessageBox>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {query.data.map((roster) => (
        <Link href={`/user/rosters/${roster._id}`} key={roster._id}>
          <OwnRostersBrowserItem roster={roster} />
        </Link>
      ))}
    </div>
  );
}
