"use client";

import { MessageBox } from "@/components/common/message-box";
import { NewPVPSeasonDialog } from "@/components/dialogs/new-pvp-season-dialog";
import { useQueryWithStatus } from "@/lib/convex";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { api } from "~convex/api";

export function PVPSeasonsView() {
  const query = useQueryWithStatus(api.pvp.getOwnSeasons);

  if (query.status === "pending") {
    return <MessageBox>Loading...</MessageBox>;
  }

  if (query.status === "error") {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        Failed to load PVP seasons.
      </MessageBox>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <NewPVPSeasonDialog>
        <div className="border border-dashed flex flex-col gap-2 items-center justify-center h-full rounded-md p-4 hover:bg-accent cursor-pointer">
          <PlusIcon className="size-8" />
          <div className="text-xl font-medium">Create New Season</div>
        </div>
      </NewPVPSeasonDialog>

      {query.data?.map((season) => (
        <Link href={`/pvp/${season._id}`} key={season._id}>
          <div
            key={season._id}
            className="h-full flex flex-col items-center justify-center gap-2 border rounded-md p-4 hover:bg-accent relative"
          >
            <h2 className="text-2xl font-bold">{season.name}</h2>

            <p className="text-sm text-muted-foreground">
              Server: {season.gameServer}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
