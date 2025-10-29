"use client";

import {
  PVPMatchGroup,
  type PVPMatchGroupItem,
} from "@/app/pvp/_components/pvp-match-group";
import { useMemo } from "react";
import type { Doc, Id } from "~convex/dataModel";

export type PVPMatchesListProps = {
  seasonId: Id<"pvpSeason">;
  matches: Array<Doc<"pvpMatchRecord">>;
};

export function PVPMatchesList({ seasonId, matches }: PVPMatchesListProps) {
  const groupedMatches = useMemo<PVPMatchGroupItem[]>(() => {
    const days: Record<number, Array<Doc<"pvpMatchRecord">>> = {};

    for (const match of matches) {
      const dayStart = new Date(match.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayKey = dayStart.getTime();

      if (!days[dayKey]) {
        days[dayKey] = [];
      }

      days[dayKey].push(match);
    }

    return Array.from(Object.entries(days))
      .map(([dayKey, dayMatches]) => ({
        dayTimestamp: Number(dayKey),
        matches: dayMatches,
      }))
      .sort((a, b) => b.dayTimestamp - a.dayTimestamp);
  }, [matches]);

  return (
    <div className="flex flex-col gap-6">
      {groupedMatches.map((group) => (
        <PVPMatchGroup
          key={group.dayTimestamp}
          seasonId={seasonId}
          group={group}
        />
      ))}
    </div>
  );
}
