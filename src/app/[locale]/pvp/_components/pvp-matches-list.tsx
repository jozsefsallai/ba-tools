"use client";

import { PVPMatchGroup } from "@/app/[locale]/pvp/_components/pvp-match-group";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { usePaginatedQuery } from "convex/react";
import { addDays, format, startOfDay, subDays } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

const DAY_PAGE_SIZE = 30;

export type PVPMatchesListProps = {
  seasonId: Id<"pvpSeason">;
  hideEmptyDays?: boolean;
};

type PVPMatchDayProps = {
  seasonId: Id<"pvpSeason">;
  day: Date;
  hideEmptyDays: boolean;
  onStateChange: (dayTimestamp: number, hasMatches: boolean | null) => void;
};

function PVPMatchDay({
  seasonId,
  day,
  hideEmptyDays,
  onStateChange,
}: PVPMatchDayProps) {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = addDays(startOfDay(day), 1).getTime();

  const { results, status, loadMore } = usePaginatedQuery(
    api.pvp.getMatchesForDay,
    { seasonId, dayStart, dayEnd },
    { initialNumItems: DAY_PAGE_SIZE },
  );

  useEffect(() => {
    onStateChange(
      dayStart,
      status === "LoadingFirstPage" ? null : results.length > 0,
    );
  }, [dayStart, onStateChange, results.length, status]);

  if (status === "LoadingFirstPage") {
    return null;
  }

  if (hideEmptyDays && results.length === 0 && status === "Exhausted") {
    return null;
  }

  return (
    <PVPMatchGroup
      seasonId={seasonId}
      group={{ dayTimestamp: dayStart, matches: results }}
      paginationStatus={status}
      loadMore={loadMore}
    />
  );
}

export function PVPMatchesList({
  seasonId,
  hideEmptyDays = false,
}: PVPMatchesListProps) {
  const t = useTranslations();
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

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => subDays(selectedEnd, index)),
    [selectedEnd],
  );

  const [dayStates, setDayStates] = useState<Record<number, boolean | null>>(
    {},
  );

  const rangeKey = selectedEnd.getTime();

  useEffect(() => {
    setDayStates({});
  }, [rangeKey]);

  const handleDayStateChange = useCallback(
    (dayTimestamp: number, hasMatches: boolean | null) => {
      setDayStates((current) => {
        if (current[dayTimestamp] === hasMatches) {
          return current;
        }

        return { ...current, [dayTimestamp]: hasMatches };
      });
    },
    [],
  );

  const hasLoadingDay = days.some(
    (day) => dayStates[startOfDay(day).getTime()] == null,
  );
  const hasMatches = Object.values(dayStates).some((value) => value === true);

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
      {days.map((day) => (
        <PVPMatchDay
          key={startOfDay(day).getTime()}
          seasonId={seasonId}
          day={day}
          hideEmptyDays={hideEmptyDays}
          onStateChange={handleDayStateChange}
        />
      ))}
      {hideEmptyDays && !hasLoadingDay && !hasMatches && (
        <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">
          {t("tools.pvp.season.noMatchesInRange")}
        </p>
      )}
    </div>
  );
}
