"use client";

import {
  BannerStudents,
  RaidChips,
  RoadmapItemDetails,
} from "@/components/roadmap/roadmap-item-details";
import { useBirthdaySources } from "@/components/roadmap/use-birthday-sources";
import {
  type RoadmapLabels,
  useRoadmapLabels,
} from "@/components/roadmap/use-roadmap-labels";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DAY_MS,
  LANE_HEIGHTS,
  getCategorySwatch,
  getItemSwatch,
  isEditableKind,
  isFestBanner,
  isLimitedBanner,
} from "@/lib/roadmap/constants";
import {
  addUTCDays,
  assignLanes,
  dateToX,
  generateBirthdays,
  generateGaTickets,
  generateShopResets,
  isDotItem,
  xToDate,
} from "@/lib/roadmap/layout";
import { getRaidImage } from "@/lib/roadmap/raid-images";
import {
  addCalendarDays,
  calendarDate,
  dayOfWeek,
  startOfMonth,
  toUTCCalendarDay,
} from "@/lib/roadmap/time-zone";
import type {
  EditableRoadmapItem,
  RoadmapCategory,
  RoadmapItem,
} from "@/lib/roadmap/types";
import { buildStudentIconUrlFromId } from "@/lib/url";
import { cn } from "@/lib/utils";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useMeasure from "react-use-measure";

const INITIAL_DAYS = 120;
const EXTEND_DAYS = 90;
const HEADER_HEIGHT = 44;
const DOT_LABEL_MAX_WIDTH = 220;
const DRAG_THRESHOLD_PX = 4;

export type RoadmapDragMode = "move" | "start" | "end";

export type RoadmapItemChange = {
  startDate: string;
  endDate: string;
};

export type RoadmapTimelineProps = {
  items: RoadmapItem[];
  rangeStart: Date;
  categories: RoadmapCategory[];
  dayWidth: number;
  showEmptyCategories?: boolean;
  editable?: boolean;
  onItemChange?: (
    item: EditableRoadmapItem,
    change: RoadmapItemChange,
    mode: RoadmapDragMode,
  ) => void;
  onItemOpen?: (item: EditableRoadmapItem) => void;
  renderItemMenu?: (item: RoadmapItem) => ReactNode;
  renderEmptyMenu?: (category: RoadmapCategory, date: Date) => ReactNode;
};

type DragState = {
  item: EditableRoadmapItem;
  mode: RoadmapDragMode;
  originX: number;
  deltaDays: number;
  active: boolean;
};

type MenuTarget =
  | { type: "item"; item: RoadmapItem }
  | { type: "empty"; category: RoadmapCategory; date: Date };

function stickyOffset(left: number, max: number): string {
  return `clamp(0px, calc(var(--roadmap-scroll, 0px) - ${left}px), ${Math.max(0, max)}px)`;
}

function estimateDotWidthPx(label: string, extra = 0) {
  return (
    Math.min(DOT_LABEL_MAX_WIDTH, Math.max(label.length, 12) * 6.5 + extra) + 28
  );
}

function dotExtraWidth(item: RoadmapItem) {
  return item.kind === "birthday"
    ? Math.min(item.students.length, 3) * 11 + 10
    : 0;
}

function clampDelta(
  item: RoadmapItem,
  mode: RoadmapDragMode,
  deltaDays: number,
): number {
  if (mode === "move") {
    return deltaDays;
  }

  const durationDays = Math.ceil(
    (new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) /
      DAY_MS,
  );
  const limit = Math.max(0, durationDays - 1);

  return mode === "start"
    ? Math.min(deltaDays, limit)
    : Math.max(deltaDays, -limit);
}

export function applyDragDelta(
  item: RoadmapItem,
  mode: RoadmapDragMode,
  deltaDays: number,
): RoadmapItemChange {
  const permanent = isDotItem(item);
  const start = new Date(item.startDate);
  const end = new Date(item.endDate);

  switch (mode) {
    case "move":
      return {
        startDate: addUTCDays(start, deltaDays).toISOString(),
        endDate: permanent
          ? end.toISOString()
          : addUTCDays(end, deltaDays).toISOString(),
      };
    case "start":
      return {
        startDate: addUTCDays(start, deltaDays).toISOString(),
        endDate: end.toISOString(),
      };
    case "end":
      return {
        startDate: start.toISOString(),
        endDate: addUTCDays(end, deltaDays).toISOString(),
      };
  }
}

export function RoadmapTimeline({
  items,
  rangeStart,
  categories,
  dayWidth,
  showEmptyCategories,
  editable,
  onItemChange,
  onItemOpen,
  renderItemMenu,
  renderEmptyMenu,
}: RoadmapTimelineProps) {
  const labels = useRoadmapLabels();
  const birthdaySources = useBirthdaySources();

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [measureRef, bounds] = useMeasure();

  const [loadedDays, setLoadedDays] = useState(INITIAL_DAYS);
  const [scrollAnchor, setScrollAnchor] = useState(0);
  const scrollAnchorRef = useRef(0);

  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);

  const panRef = useRef<{
    originX: number;
    scrollLeft: number;
    active: boolean;
  } | null>(null);
  const [panning, setPanning] = useState(false);

  const [menuTarget, setMenuTarget] = useState<MenuTarget | null>(null);

  const tz = labels.tz;

  const rangeEnd = useMemo(
    () => addCalendarDays(rangeStart, loadedDays, tz),
    [rangeStart, loadedDays, tz],
  );
  const totalWidth = loadedDays * dayWidth;
  const viewportWidth = bounds.width || 1200;

  const allItems = useMemo(
    () => [
      ...items,
      ...(categories.includes("gaTicket") ? generateGaTickets(items) : []),
      ...(categories.includes("birthday")
        ? generateBirthdays(rangeStart, rangeEnd, birthdaySources, tz)
        : []),
      ...(categories.includes("shopReset")
        ? generateShopResets(rangeStart, rangeEnd)
        : []),
    ],
    [items, categories, rangeStart, rangeEnd, birthdaySources, tz],
  );

  const rows = useMemo(() => {
    const dotWidthMs = (item: RoadmapItem) =>
      (estimateDotWidthPx(labels.title(item), dotExtraWidth(item)) / dayWidth) *
      DAY_MS;

    return categories
      .map((category) => {
        const categoryItems = allItems.filter(
          (item) =>
            item.kind === category &&
            new Date(isDotItem(item) ? item.startDate : item.endDate) >=
              rangeStart,
        );
        const { lanes, laneCount } = assignLanes(categoryItems, dotWidthMs, {
          longestFirst: category === "event",
        });
        const laneHeight = LANE_HEIGHTS[category];

        return {
          category,
          items: categoryItems,
          lanes,
          laneHeight,
          height: laneCount * laneHeight + 8,
        };
      })
      .filter((row) => showEmptyCategories || row.items.length > 0);
  }, [allItems, categories, dayWidth, labels, rangeStart, showEmptyCategories]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      return;
    }

    el.style.setProperty("--roadmap-scroll", `${el.scrollLeft}px`);

    if (
      Math.abs(el.scrollLeft - scrollAnchorRef.current) >
      el.clientWidth / 2
    ) {
      scrollAnchorRef.current = el.scrollLeft;
      setScrollAnchor(el.scrollLeft);
    }

    if (el.scrollLeft + el.clientWidth * 2 >= el.scrollWidth) {
      setLoadedDays((days) => days + EXTEND_DAYS);
    }
  }, []);

  const prevDayWidth = useRef(dayWidth);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || prevDayWidth.current === dayWidth) {
      return;
    }

    const centerDays =
      (el.scrollLeft + el.clientWidth / 2) / prevDayWidth.current;
    prevDayWidth.current = dayWidth;
    el.scrollLeft = Math.max(0, centerDays * dayWidth - el.clientWidth / 2);
    handleScroll();
  }, [dayWidth, handleScroll]);

  useEffect(() => {
    if (bounds.width && loadedDays * dayWidth < bounds.width * 3) {
      setLoadedDays(Math.ceil((bounds.width * 3) / dayWidth));
    }
  }, [bounds.width, dayWidth, loadedDays]);

  const windowStart = scrollAnchor - viewportWidth;
  const windowEnd = scrollAnchor + viewportWidth * 2;

  const days = useMemo(() => {
    const first = Math.max(0, Math.floor(windowStart / dayWidth));
    const last = Math.min(loadedDays, Math.ceil(windowEnd / dayWidth));
    const result: { index: number; date: Date }[] = [];

    for (let i = first; i < last; i++) {
      result.push({ index: i, date: addCalendarDays(rangeStart, i, tz) });
    }

    return result;
  }, [windowStart, windowEnd, dayWidth, loadedDays, rangeStart, tz]);

  const months = useMemo(() => {
    const result: { key: string; left: number; width: number; date: Date }[] =
      [];
    const cursor = startOfMonth(rangeStart, tz);

    while (cursor < rangeEnd) {
      const next = startOfMonth(cursor, tz, 1);

      const left = Math.max(0, dateToX(cursor, rangeStart, dayWidth));
      const right = Math.min(totalWidth, dateToX(next, rangeStart, dayWidth));

      if (right > windowStart && left < windowEnd) {
        result.push({
          key: cursor.toISOString(),
          left,
          width: right - left,
          date: new Date(cursor),
        });
      }

      cursor.setTime(next.getTime());
    }

    return result;
  }, [rangeStart, rangeEnd, dayWidth, totalWidth, windowStart, windowEnd, tz]);

  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const nowX = now === null ? null : dateToX(now, rangeStart, dayWidth);

  const handlePointerDown = (
    event: React.PointerEvent<HTMLElement>,
    item: RoadmapItem,
  ) => {
    if (!editable || event.button !== 0 || !isEditableKind(item.kind)) {
      return;
    }

    const edge = (event.target as HTMLElement)
      .closest("[data-edge]")
      ?.getAttribute("data-edge");
    const mode: RoadmapDragMode =
      edge === "start" || edge === "end" ? edge : "move";

    event.currentTarget.setPointerCapture(event.pointerId);
    const state: DragState = {
      item: item as EditableRoadmapItem,
      mode,
      originX: event.clientX,
      deltaDays: 0,
      active: false,
    };
    dragRef.current = state;
    setDrag(state);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const state = dragRef.current;
    if (!state) {
      return;
    }

    const dx = event.clientX - state.originX;
    if (!state.active && Math.abs(dx) < DRAG_THRESHOLD_PX) {
      return;
    }

    const deltaDays = clampDelta(
      state.item,
      state.mode,
      Math.round(dx / dayWidth),
    );

    if (!state.active || deltaDays !== state.deltaDays) {
      const next = { ...state, active: true, deltaDays };
      dragRef.current = next;
      setDrag(next);
    }
  };

  const handlePointerUp = () => {
    const state = dragRef.current;
    dragRef.current = null;
    setDrag(null);

    if (!state?.active) {
      return;
    }

    suppressClickRef.current = true;
    if (state.deltaDays !== 0) {
      onItemChange?.(
        state.item,
        applyDragDelta(state.item, state.mode, state.deltaDays),
        state.mode,
      );
    }
  };

  const canPan = !editable;

  const handlePanStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !canPan ||
      event.pointerType !== "mouse" ||
      event.button !== 0 ||
      !scrollRef.current
    ) {
      return;
    }

    panRef.current = {
      originX: event.clientX,
      scrollLeft: scrollRef.current.scrollLeft,
      active: false,
    };
  };

  const handlePanMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    const el = scrollRef.current;
    if (!pan || !el) {
      return;
    }

    const dx = event.clientX - pan.originX;
    if (!pan.active) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX) {
        return;
      }
      pan.active = true;
      el.setPointerCapture(event.pointerId);
      setPanning(true);
    }

    el.scrollLeft = pan.scrollLeft - dx;
  };

  const handlePanEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    panRef.current = null;
    if (!pan?.active) {
      return;
    }

    suppressClickRef.current = true;
    scrollRef.current?.releasePointerCapture(event.pointerId);
    setPanning(false);
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const itemEl = target.closest<HTMLElement>("[data-roadmap-item]");
    const rowEl = target.closest<HTMLElement>("[data-roadmap-category]");

    if (itemEl) {
      const item = allItems.find(
        (candidate) => candidate.id === itemEl.dataset.roadmapItem,
      );
      if (item) {
        setMenuTarget({ type: "item", item });
        return;
      }
    }

    if (rowEl && contentRef.current) {
      const x = event.clientX - contentRef.current.getBoundingClientRect().left;
      setMenuTarget({
        type: "empty",
        category: rowEl.dataset.roadmapCategory as RoadmapCategory,
        date: toUTCCalendarDay(xToDate(x, rangeStart, dayWidth), tz),
      });
      return;
    }

    setMenuTarget(null);
  };

  const menuContent =
    menuTarget?.type === "item"
      ? renderItemMenu?.(menuTarget.item)
      : menuTarget?.type === "empty"
        ? renderEmptyMenu?.(menuTarget.category, menuTarget.date)
        : null;

  const grid = (
    <div
      ref={contentRef}
      className="relative shrink-0"
      style={{ width: totalWidth }}
    >
      <div
        className="relative border-b bg-card"
        style={{ height: HEADER_HEIGHT }}
      >
        {months.map((month) => (
          <div
            key={month.key}
            className="absolute top-0 h-5 border-l border-foreground/20 overflow-hidden"
            style={{ left: month.left, width: month.width }}
          >
            <span
              className="absolute top-0.5 text-xs font-bold whitespace-nowrap px-1.5"
              style={{ left: stickyOffset(month.left, month.width - 90) }}
            >
              {labels.formatMonth(month.date)}
            </span>
          </div>
        ))}

        {days.map(({ index, date }) => {
          const weekday = dayOfWeek(date, tz);
          const isWeekend = weekday === 0 || weekday === 6;
          return (
            <div
              key={index}
              className={cn(
                "absolute bottom-0 h-6 flex flex-col items-center justify-end pb-0.5 text-[10px] leading-none tabular-nums border-l border-border/60",
                { "text-muted-foreground": isWeekend },
              )}
              style={{
                left: dateToX(date, rangeStart, dayWidth),
                width: dayWidth,
              }}
            >
              {dayWidth >= 40 && (
                <span className="opacity-60">{labels.formatWeekday(date)}</span>
              )}
              <span className="font-semibold">
                {calendarDate(date, tz).day}
              </span>
            </div>
          );
        })}
      </div>

      {rows.map((row) => (
        <div
          key={row.category}
          data-roadmap-category={row.category}
          className="relative border-b"
          style={{
            height: row.height,
            backgroundImage:
              "linear-gradient(to right, color-mix(in oklab, var(--border) 55%, transparent) 1px, transparent 1px)",
            backgroundSize: `${dayWidth}px 100%`,
          }}
        >
          {row.items.map((item) => {
            const lane = row.lanes.get(item.id) ?? 0;
            const top = 4 + lane * row.laneHeight;
            const isDragging = drag?.active && drag.item.id === item.id;
            const display = isDragging
              ? { ...item, ...applyDragDelta(item, drag.mode, drag.deltaDays) }
              : item;

            const dot = isDotItem(item);
            const left = dateToX(display.startDate, rangeStart, dayWidth);
            const right = dot
              ? left +
                estimateDotWidthPx(labels.title(item), dotExtraWidth(item))
              : dateToX(display.endDate, rangeStart, dayWidth);

            if (right < windowStart || left > windowEnd) {
              return null;
            }

            const commonProps = {
              item: display,
              labels,
              top,
              height: row.laneHeight - 4,
              editable: editable && isEditableKind(item.kind),
              dragging: !!isDragging,
              tooltipsDisabled: panning,
              onPointerDown: (event: React.PointerEvent<HTMLElement>) =>
                handlePointerDown(event, item),
              onPointerMove: handlePointerMove,
              onPointerUp: handlePointerUp,
              onDoubleClick: () => {
                if (editable && isEditableKind(item.kind)) {
                  onItemOpen?.(item as EditableRoadmapItem);
                }
              },
              onClickCapture: (event: React.MouseEvent) => {
                if (suppressClickRef.current) {
                  suppressClickRef.current = false;
                  event.stopPropagation();
                }
              },
            };

            return dot ? (
              <RoadmapDot key={item.id} {...commonProps} left={left} />
            ) : (
              <RoadmapBar
                key={item.id}
                {...commonProps}
                left={Math.max(0, left)}
                width={Math.max(right - Math.max(0, left), 6)}
                clippedStart={left < 0}
                contentOffset={stickyOffset(
                  Math.max(0, left),
                  right - left - 140,
                )}
              />
            );
          })}
        </div>
      ))}

      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{ top: HEADER_HEIGHT }}
      >
        {months.map((month) =>
          month.left > 0 ? (
            <div
              key={month.key}
              className="absolute inset-y-0 border-l border-foreground/20"
              style={{ left: month.left }}
            />
          ) : null,
        )}
        {nowX !== null && (
          <div
            className="absolute inset-y-0 border-l-2 border-red-500/80"
            style={{ left: nowX }}
          />
        )}
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div
        ref={(el) => {
          scrollRef.current = el;
          measureRef(el);
        }}
        onScroll={handleScroll}
        onPointerDown={handlePanStart}
        onPointerMove={handlePanMove}
        onPointerUp={handlePanEnd}
        onPointerCancel={handlePanEnd}
        onClickCapture={(event) => {
          if (canPan && suppressClickRef.current) {
            suppressClickRef.current = false;
            event.stopPropagation();
          }
        }}
        className={cn(
          "relative overflow-x-auto overscroll-x-contain rounded-md border bg-card",
          {
            "cursor-grab": canPan,
            "cursor-grabbing select-none": panning,
          },
        )}
      >
        <div className="flex w-max min-w-full">
          <div className="sticky left-0 z-20 shrink-0 w-24 md:w-40 bg-card border-r shadow-[2px_0_6px_-4px_rgba(0,0,0,0.3)]">
            <div
              className="flex items-end px-2 pb-1 text-[10px] font-semibold text-muted-foreground border-b"
              style={{ height: HEADER_HEIGHT }}
            >
              {labels.zoneName}
            </div>

            {rows.map((row) => (
              <div
                key={row.category}
                className="flex items-start gap-1.5 px-2 pt-2 border-b text-xs md:text-sm font-semibold"
                style={{ height: row.height }}
              >
                <span
                  className={cn(
                    "mt-1 size-2 shrink-0 rounded-full",
                    getCategorySwatch(row.category).dot,
                  )}
                />

                <span className="leading-tight">
                  {labels.category(row.category)}
                </span>
              </div>
            ))}
          </div>

          {editable ? (
            <ContextMenu
              onOpenChange={(open) => {
                if (!open) {
                  setMenuTarget(null);
                }
              }}
            >
              <ContextMenuTrigger asChild onContextMenu={handleContextMenu}>
                {grid}
              </ContextMenuTrigger>

              {menuContent && (
                <ContextMenuContent className="w-56">
                  {menuContent}
                </ContextMenuContent>
              )}
            </ContextMenu>
          ) : (
            grid
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

type ItemProps = {
  item: RoadmapItem;
  labels: RoadmapLabels;
  top: number;
  height: number;
  left: number;
  editable?: boolean;
  dragging: boolean;
  tooltipsDisabled?: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  onDoubleClick: () => void;
  onClickCapture: (event: React.MouseEvent) => void;
};

function ItemTooltip({
  item,
  labels,
  disabled,
  children,
}: {
  item: RoadmapItem;
  labels: RoadmapLabels;
  disabled: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pointerType = useRef("");

  return (
    <Tooltip open={!disabled && open} onOpenChange={setOpen}>
      <TooltipTrigger
        asChild
        onPointerDown={(event) => {
          pointerType.current = event.pointerType;
        }}
        onClick={(event) => {
          if (pointerType.current !== "touch") {
            return;
          }

          event.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </TooltipTrigger>

      <TooltipContent className="max-w-[min(24rem,calc(100vw-2rem))]">
        <RoadmapItemDetails item={item} labels={labels} />
      </TooltipContent>
    </Tooltip>
  );
}

function BarContent({
  item,
  labels,
}: { item: RoadmapItem; labels: RoadmapLabels }) {
  const subtitle = labels.subtitle(item);
  const fest = isFestBanner(item);
  const limited = isLimitedBanner(item);
  const freePulls = item.kind === "banner" ? item.freePulls : 0;

  return (
    <>
      {subtitle && (
        <div className="truncate text-[9px] leading-3 font-bold uppercase opacity-70">
          {subtitle}
        </div>
      )}

      {item.kind === "banner" ? (
        <>
          {(item.name || fest || limited || freePulls > 0) && (
            <div className="flex items-center gap-1 min-w-0">
              {fest && (
                <span className="shrink-0 rounded-sm bg-amber-500 px-1 text-[9px] leading-3.5 font-bold text-white">
                  {labels.t("static.banners.item.fest")}
                </span>
              )}

              {limited && (
                <span className="shrink-0 rounded-sm bg-violet-600 px-1 text-[9px] leading-3.5 font-bold uppercase text-white">
                  {labels.t("static.banners.item.limited")}
                </span>
              )}

              {freePulls > 0 && (
                <span className="shrink-0 rounded-sm border border-emerald-600/60 bg-emerald-500/15 px-1 text-[9px] leading-3 font-bold text-emerald-800 dark:text-emerald-200">
                  {labels.t("static.banners.item.freePulls", {
                    count: freePulls,
                  })}
                </span>
              )}

              {item.name && (
                <span className="truncate text-xs font-bold">{item.name}</span>
              )}
            </div>
          )}

          <BannerStudents
            students={item.students}
            size={22}
            fit
            className="py-0.5"
          />
        </>
      ) : (
        <div className="truncate text-xs font-bold">{labels.title(item)}</div>
      )}

      {(item.kind === "raid" || item.kind === "frr") && (
        <RaidChips
          item={item}
          labels={labels}
          compact
          className="flex-nowrap"
        />
      )}

      {item.kind === "etc" && item.description && (
        <div className="truncate text-[10px] opacity-80">
          {item.description}
        </div>
      )}

      <div className="truncate text-[10px] tabular-nums opacity-75">
        {labels.dateRange(item)}
      </div>
    </>
  );
}

type BarArt = {
  src: string;
  variant: "faded" | "fadedSquare" | "icon";
};

function getBarArt(item: RoadmapItem): BarArt | null {
  if (item.kind === "raid" || item.kind === "frr") {
    const art = getRaidImage(item);
    if (!art) {
      return null;
    }
    return {
      src: art.image.src,
      variant: art.shape === "square" ? "icon" : "faded",
    };
  }

  if (item.kind === "banner" && item.students.length > 0) {
    return {
      src: buildStudentIconUrlFromId(item.students[0].id),
      variant: "fadedSquare",
    };
  }

  if (item.kind === "event" && item.eventStudent) {
    return {
      src: buildStudentIconUrlFromId(item.eventStudent.id),
      variant: "fadedSquare",
    };
  }

  return null;
}

function BarArtImage({ art }: { art: BarArt }) {
  return (
    <img
      src={art.src}
      alt=""
      aria-hidden
      draggable={false}
      loading="lazy"
      className={cn("pointer-events-none absolute", {
        "inset-y-1 right-1 h-[calc(100%-0.5rem)] w-auto aspect-square object-contain":
          art.variant === "icon",
        "inset-y-0 right-0 h-full w-auto max-w-[75%] object-contain object-left opacity-45 dark:opacity-35":
          art.variant === "faded",
        "inset-y-0 right-0 h-full w-auto aspect-square object-cover opacity-60 dark:opacity-50":
          art.variant === "fadedSquare",
      })}
      style={
        art.variant === "icon"
          ? undefined
          : {
              maskImage: "linear-gradient(to right, transparent, black 45%)",
            }
      }
    />
  );
}

function RoadmapBar({
  item,
  labels,
  top,
  height,
  left,
  width,
  clippedStart,
  contentOffset,
  editable,
  dragging,
  tooltipsDisabled,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
  onClickCapture,
}: ItemProps & {
  width: number;
  clippedStart: boolean;
  contentOffset: string;
}) {
  const art = getBarArt(item);
  const swatch = getItemSwatch(item);

  return (
    <ItemTooltip
      item={item}
      labels={labels}
      disabled={dragging || !!tooltipsDisabled}
    >
      <div
        data-roadmap-item={item.id}
        className={cn(
          "group absolute flex flex-col justify-center overflow-hidden rounded-md border px-1.5 select-none",
          swatch.bar,
          {
            "rounded-l-none border-l-0": clippedStart,
            "cursor-grab touch-none": editable,
            "cursor-grabbing z-10 shadow-lg ring-2 ring-primary": dragging,
          },
        )}
        style={{ top, height, left, width }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onClickCapture={onClickCapture}
      >
        {art && <BarArtImage art={art} />}

        {isFestBanner(item) && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/3 w-2/3 -skew-x-[45deg] bg-gradient-to-r from-transparent via-amber-300/35 dark:via-amber-300/20 to-transparent"
          />
        )}

        <div
          className="relative flex flex-col gap-px min-w-0"
          style={{
            transform: `translateX(${contentOffset})`,
            // keep text clear of square drill icons
            paddingRight: art?.variant === "icon" ? height : undefined,
          }}
        >
          <BarContent item={item} labels={labels} />
        </div>

        {editable && (
          <>
            {!clippedStart && (
              <div
                data-edge="start"
                className="absolute inset-y-0 left-0 w-2 cursor-ew-resize hover:bg-foreground/15"
              />
            )}
            <div
              data-edge="end"
              className="absolute inset-y-0 right-0 w-2 cursor-ew-resize hover:bg-foreground/15"
            />
          </>
        )}
      </div>
    </ItemTooltip>
  );
}

function RoadmapDot({
  item,
  labels,
  top,
  height,
  left,
  editable,
  dragging,
  tooltipsDisabled,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
  onClickCapture,
}: ItemProps) {
  const swatch = getItemSwatch(item);
  const subtitle = labels.subtitle(item);

  return (
    <ItemTooltip
      item={item}
      labels={labels}
      disabled={dragging || !!tooltipsDisabled}
    >
      <div
        data-roadmap-item={item.id}
        className={cn("absolute flex items-start gap-1.5 select-none", {
          "cursor-grab touch-none": editable,
          "cursor-grabbing z-10": dragging,
        })}
        style={{ top, height, left: left - 5 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onClickCapture={onClickCapture}
      >
        <span
          className={cn(
            "mt-1 size-2.5 shrink-0 rounded-full ring-2 ring-card",
            swatch.dot,
            { "ring-primary": dragging },
          )}
        />

        <div
          className="flex flex-col min-w-0"
          style={{ maxWidth: DOT_LABEL_MAX_WIDTH }}
        >
          {subtitle && (
            <div className="truncate text-[9px] leading-3 font-bold uppercase text-muted-foreground">
              {subtitle}
            </div>
          )}
          {item.kind === "birthday" ? (
            <div className="flex items-center gap-1 min-w-0">
              <div className="flex shrink-0 -space-x-1.5">
                {item.students.slice(0, 3).map((student) => (
                  <img
                    key={student.id}
                    src={buildStudentIconUrlFromId(student.id)}
                    alt=""
                    width={16}
                    height={16}
                    loading="lazy"
                    draggable={false}
                    className="size-4 rounded-full border border-card bg-background object-cover"
                  />
                ))}
              </div>

              <span className="truncate text-xs font-bold">
                {labels.title(item)}
              </span>
            </div>
          ) : (
            <div className="truncate text-xs font-bold">
              {labels.title(item)}
            </div>
          )}

          {item.kind === "etc" && item.description && (
            <div className="truncate text-[10px] text-muted-foreground">
              {item.description}
            </div>
          )}

          <div className="truncate text-[10px] tabular-nums text-muted-foreground">
            {item.kind === "birthday"
              ? labels.formatDate(item.startDate)
              : labels.formatDateTime(item.startDate)}
          </div>
        </div>
      </div>
    </ItemTooltip>
  );
}
