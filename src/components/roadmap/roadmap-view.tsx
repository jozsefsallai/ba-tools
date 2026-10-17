"use client";

import { RoadmapList } from "@/components/roadmap/roadmap-list";
import { RoadmapTimeZoneProvider } from "@/components/roadmap/roadmap-time-zone";
import { RoadmapTimeline } from "@/components/roadmap/roadmap-timeline";
import { useRoadmapLabels } from "@/components/roadmap/use-roadmap-labels";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ROADMAP_CATEGORIES, getCategorySwatch } from "@/lib/roadmap/constants";
import { type RoadmapTimeZone, startOfDay } from "@/lib/roadmap/time-zone";
import type { RoadmapCategory, RoadmapItem } from "@/lib/roadmap/types";
import { cn } from "@/lib/utils";
import {
  ChartNoAxesGanttIcon,
  ClockIcon,
  FilterIcon,
  GlobeIcon,
  ListIcon,
  ZoomInIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

export const DAY_WIDTHS = [24, 40, 64] as const;
export type RoadmapViewMode = "timeline" | "text";

type StoredPrefs = {
  view?: RoadmapViewMode;
  dayWidth?: number;
  hidden?: RoadmapCategory[];
  timeZone?: RoadmapTimeZone;
};

function readPrefs(key: string): StoredPrefs {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}");
  } catch {
    return {};
  }
}

function writePrefs(key: string, prefs: StoredPrefs) {
  try {
    localStorage.setItem(key, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function useRoadmapRangeStart(
  now: number,
  tz: RoadmapTimeZone = "utc",
): Date {
  const [rangeStart, setRangeStart] = useState(() => startOfDay(now, "utc"));

  useEffect(() => {
    const today = startOfDay(Date.now(), tz);
    if (today.getTime() !== rangeStart.getTime()) {
      setRangeStart(today);
    }
  }, [rangeStart, tz]);

  return rangeStart;
}

export type RoadmapControlsState = {
  view: RoadmapViewMode;
  dayWidth: number;
  hidden: RoadmapCategory[];
  timeZone: RoadmapTimeZone;
};

export function useRoadmapControls(storageKey: string, allowText = true) {
  const [state, setState] = useState<RoadmapControlsState>({
    view: "timeline",
    dayWidth: 40,
    hidden: [],
    timeZone: "utc",
  });

  useEffect(() => {
    const prefs = readPrefs(storageKey);

    setState((prev) => ({
      view: allowText && prefs.view === "text" ? "text" : prev.view,
      dayWidth: DAY_WIDTHS.includes(prefs.dayWidth as 24)
        ? (prefs.dayWidth as number)
        : prev.dayWidth,
      hidden: Array.isArray(prefs.hidden) ? prefs.hidden : prev.hidden,
      timeZone: prefs.timeZone === "local" ? "local" : "utc",
    }));
  }, [storageKey, allowText]);

  const update = (patch: Partial<RoadmapControlsState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      writePrefs(storageKey, next);
      return next;
    });
  };

  return [state, update] as const;
}

export function RoadmapControls({
  state,
  onChange,
  categories = ROADMAP_CATEGORIES,
  allowText = true,
  children,
}: {
  state: RoadmapControlsState;
  onChange: (patch: Partial<RoadmapControlsState>) => void;
  categories?: RoadmapCategory[];
  allowText?: boolean;
  children?: ReactNode;
}) {
  const labels = useRoadmapLabels();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowText && (
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={state.view}
          onValueChange={(value) => {
            if (value) {
              onChange({ view: value as RoadmapViewMode });
            }
          }}
          aria-label={labels.t("static.roadmap.view.label")}
        >
          <ToggleGroupItem value="timeline" className="flex-none px-3">
            <ChartNoAxesGanttIcon />
            {labels.t("static.roadmap.view.timeline")}
          </ToggleGroupItem>

          <ToggleGroupItem value="text" className="flex-none px-3">
            <ListIcon />
            {labels.t("static.roadmap.view.text")}
          </ToggleGroupItem>
        </ToggleGroup>
      )}

      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={state.timeZone}
        onValueChange={(value) => {
          if (value) {
            onChange({ timeZone: value as RoadmapTimeZone });
          }
        }}
        aria-label={labels.t("static.roadmap.timeZone.label")}
      >
        <ToggleGroupItem value="utc" className="flex-none px-3">
          <GlobeIcon />
          {labels.t("static.roadmap.timeZone.utc")}
        </ToggleGroupItem>

        <ToggleGroupItem value="local" className="flex-none px-3">
          <ClockIcon />
          {labels.t("static.roadmap.timeZone.local")}
        </ToggleGroupItem>
      </ToggleGroup>

      {state.view === "timeline" && (
        <div className="flex items-center gap-1.5">
          <ZoomInIcon aria-hidden className="size-4 text-muted-foreground" />

          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={String(state.dayWidth)}
            onValueChange={(value) => {
              if (value) {
                onChange({ dayWidth: Number(value) });
              }
            }}
            aria-label={labels.t("static.roadmap.zoom")}
          >
            {DAY_WIDTHS.map((width, idx) => (
              <ToggleGroupItem
                key={width}
                value={String(width)}
                className="w-10 px-0"
              >
                {"+".repeat(idx + 1)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <FilterIcon />
            {labels.t("static.roadmap.categoryFilter")}
            {state.hidden.length > 0 &&
              ` (${categories.length - state.hidden.length}/${categories.length})`}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start">
          {categories.map((category) => (
            <DropdownMenuCheckboxItem
              key={category}
              checked={!state.hidden.includes(category)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) =>
                onChange({
                  hidden: checked
                    ? state.hidden.filter((c) => c !== category)
                    : [...state.hidden, category],
                })
              }
            >
              <span
                aria-hidden
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  getCategorySwatch(category).dot,
                )}
              />
              {labels.category(category)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {children}
    </div>
  );
}

export type RoadmapViewProps = {
  items: RoadmapItem[];
  now: number;
};

export function RoadmapView({ items, now }: RoadmapViewProps) {
  const [state, update] = useRoadmapControls("roadmap-view");
  const rangeStart = useRoadmapRangeStart(now, state.timeZone);

  const categories = ROADMAP_CATEGORIES.filter(
    (category) => !state.hidden.includes(category),
  );

  return (
    <RoadmapTimeZoneProvider value={state.timeZone}>
      <div className="flex flex-col gap-4">
        <RoadmapControls state={state} onChange={update} />

        {state.view === "timeline" ? (
          <RoadmapTimeline
            items={items}
            rangeStart={rangeStart}
            categories={categories}
            dayWidth={state.dayWidth}
          />
        ) : (
          <RoadmapList
            items={items}
            rangeStart={rangeStart}
            categories={categories}
          />
        )}
      </div>
    </RoadmapTimeZoneProvider>
  );
}
