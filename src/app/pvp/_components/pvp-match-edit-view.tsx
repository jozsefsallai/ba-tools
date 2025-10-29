"use client";

import { PVPMatchEditor } from "@/app/pvp/_components/pvp-match-editor";
import { MessageBox } from "@/components/common/message-box";
import { useQueryWithStatus } from "@/lib/convex";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export type PVPMatchEditViewProps = {
  seasonId: Id<"pvpSeason">;
  matchId: Id<"pvpMatchRecord">;
};

export function PVPMatchEditView({ seasonId, matchId }: PVPMatchEditViewProps) {
  const query = useQueryWithStatus(api.pvp.getMatchById, {
    seasonId,
    matchId,
  });

  if (query.status === "pending") {
    return <MessageBox>Loading...</MessageBox>;
  }

  if (query.status === "error") {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        Failed to load PVP match.
      </MessageBox>
    );
  }

  return <PVPMatchEditor seasonId={seasonId} current={query.data} />;
}
