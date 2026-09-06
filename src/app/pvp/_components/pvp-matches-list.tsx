"use client";

import {
  PVPMatchGroup,
  type PVPMatchGroupItem,
} from "@/app/pvp/_components/pvp-match-group";
import { Button } from "@/components/ui/button";
import { addDays, format, startOfDay, subDays } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { Doc, Id } from "~convex/dataModel";

export type PVPMatchesListProps = {
  seasonId: Id<"pvpSeason">;
  matches: Array<Doc<"pvpMatchRecord">>;
};

export function PVPMatchesList({ seasonId, matches }: PVPMatchesListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedEnd = searchParams.get("end")
    ? startOfDay(new Date(searchParams.get("end") as string))
    : startOfDay(new Date());

  const setEnd = (date: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("end", format(date, "yyyy-MM-dd"));
    router.push(`?${params.toString()}`);
  };

  const groupedMatches = useMemo<PVPMatchGroupItem[]>(() => {
    const days: Record<number, Array<Doc<"pvpMatchRecord">>> = {};

    const rangeStart = subDays(selectedEnd, 6).getTime();
    const rangeEnd = addDays(selectedEnd, 1).getTime();

    for (const match of matches.filter(
      (item) => item.date >= rangeStart && item.date < rangeEnd,
    )) {
      const dayStart = new Date(match.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayKey = dayStart.getTime();

      if (!days[dayKey]) {
        days[dayKey] = [];
      }

      days[dayKey].push(match);
    }

    return Array.from({ length: 7 }, (_, index) => {
      const day = subDays(selectedEnd, index);
      const dayKey = startOfDay(day).getTime();

      return {
        dayTimestamp: dayKey,
        matches: days[dayKey] ?? [],
      };
    });
  }, [matches, selectedEnd]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setEnd(subDays(selectedEnd, 7))}
        >
          <ChevronLeftIcon /> Previous 7 days
        </Button>

        <Button variant="outline" onClick={() => setEnd(new Date())}>
          Today
        </Button>

        <Button
          variant="outline"
          onClick={() => setEnd(addDays(selectedEnd, 7))}
        >
          Next 7 days <ChevronRightIcon />
        </Button>
      </div>
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
