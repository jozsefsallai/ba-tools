"use client";

import { PVPMatchGroup } from "@/app/[locale]/pvp/_components/pvp-match-group";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

export function parsePvpAgendaDate(value: string | null): Date {
  if (value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (match) {
      const date = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
      );

      if (
        date.getFullYear() === Number(match[1]) &&
        date.getMonth() === Number(match[2]) - 1 &&
        date.getDate() === Number(match[3])
      ) {
        return startOfDay(date);
      }
    }
  }

  return startOfDay(new Date());
}

export type PVPMatchesListProps = {
  seasonId: Id<"pvpSeason">;
  hideEmptyDays?: boolean;
  seasonNumber?: number;
};

type PVPMatchDayProps = {
  seasonId: Id<"pvpSeason">;
  day: Date;
  hideEmptyDays: boolean;
  onStateChange: (dayTimestamp: number, hasMatches: boolean | null) => void;
  seasonNumber?: number;
};

function PVPMatchDay({
  seasonId,
  day,
  hideEmptyDays,
  onStateChange,
  seasonNumber,
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
      seasonNumber={seasonNumber}
      group={{ dayTimestamp: dayStart, matches: results }}
      paginationStatus={status}
      loadMore={loadMore}
    />
  );
}

export function PVPMatchesList({
  seasonId,
  hideEmptyDays = false,
  seasonNumber,
}: PVPMatchesListProps) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedEnd = parsePvpAgendaDate(searchParams.get("end"));
  const [calendarOpen, setCalendarOpen] = useState(false);

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => setEnd(subDays(selectedEnd, 7))}
        >
          <ChevronLeftIcon /> Previous 7 days
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setEnd(new Date())}>
            Today
          </Button>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline">
                {t("tools.pvp.season.jumpToDate")}
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedEnd}
                defaultMonth={selectedEnd}
                captionLayout="dropdown"
                onSelect={(date) => {
                  if (date) {
                    setCalendarOpen(false);
                    setEnd(date);
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

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
          seasonNumber={seasonNumber}
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
