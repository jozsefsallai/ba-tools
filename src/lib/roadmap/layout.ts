import { parseBirthday } from "@/lib/birthdays";
import {
  DAY_MS,
  SHOP_RESET_HOUR_UTC,
  isPermanent,
} from "@/lib/roadmap/constants";
import {
  type RoadmapTimeZone,
  calendarDate,
  fromCalendarDate,
} from "@/lib/roadmap/time-zone";
import type {
  RoadmapBannerStudent,
  RoadmapBirthdayItem,
  RoadmapItem,
  RoadmapShopResetItem,
} from "@/lib/roadmap/types";

export function startOfUTCDay(date: Date | string | number): Date {
  const d = new Date(date);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

export function addUTCDays(date: Date | string, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function addMs(date: Date | string, ms: number): Date {
  return new Date(new Date(date).getTime() + ms);
}

export function dateToX(
  date: Date | string | number,
  rangeStart: Date,
  dayWidth: number,
): number {
  return (
    ((new Date(date).getTime() - rangeStart.getTime()) / DAY_MS) * dayWidth
  );
}

export function xToDate(x: number, rangeStart: Date, dayWidth: number): Date {
  return new Date(rangeStart.getTime() + (x / dayWidth) * DAY_MS);
}

export function generateShopResets(
  from: Date,
  to: Date,
): RoadmapShopResetItem[] {
  const items: RoadmapShopResetItem[] = [];
  const cursor = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1, SHOP_RESET_HOUR_UTC),
  );

  if (cursor < from) {
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  while (cursor < to) {
    const start = cursor.toISOString();
    items.push({
      kind: "shopReset",
      id: `shop-reset-${start}`,
      startDate: start,
      endDate: start,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return items;
}

export type BirthdaySource = RoadmapBannerStudent & { birthday: string };

export function generateBirthdays(
  from: Date,
  to: Date,
  students: BirthdaySource[],
  tz: RoadmapTimeZone = "utc",
): RoadmapBirthdayItem[] {
  const byDate = new Map<
    string,
    { month: number; day: number; students: RoadmapBannerStudent[] }
  >();

  for (const { birthday, ...student } of students) {
    const parsed = parseBirthday(birthday);
    if (!parsed) {
      continue;
    }

    const key = `${parsed.month}-${parsed.day}`;
    const entry = byDate.get(key) ?? { ...parsed, students: [] };
    entry.students.push(student);
    byDate.set(key, entry);
  }

  const items: RoadmapBirthdayItem[] = [];
  const firstYear = calendarDate(from, tz).year;
  const lastYear = calendarDate(to, tz).year;
  for (let year = firstYear; year <= lastYear; year++) {
    for (const { month, day, students: dayStudents } of byDate.values()) {
      const date = fromCalendarDate({ year, month: month - 1, day }, tz);

      if (calendarDate(date, tz).day !== day || date < from || date >= to) {
        continue;
      }

      const start = date.toISOString();
      items.push({
        kind: "birthday",
        id: `birthday-${start}`,
        startDate: start,
        endDate: start,
        students: dayStudents,
      });
    }
  }

  return items.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function isInstantItem(item: RoadmapItem): boolean {
  return item.kind === "shopReset" || item.kind === "birthday";
}

export function isDotItem(item: RoadmapItem): boolean {
  return isInstantItem(item) || isPermanent(item.startDate, item.endDate);
}

export type LaneAssignment = {
  lanes: Map<string, number>;
  laneCount: number;
};

type Interval = { start: number; end: number };

function packIntoLanes(
  entries: { id: string; interval: Interval }[],
  lanes: Map<string, number>,
  laneOffset: number,
): number {
  const laneIntervals: Interval[][] = [];

  for (const { id, interval } of entries) {
    let lane = laneIntervals.findIndex((placed) =>
      placed.every(
        (other) => other.end <= interval.start || other.start >= interval.end,
      ),
    );
    if (lane === -1) {
      lane = laneIntervals.length;
      laneIntervals.push([]);
    }

    laneIntervals[lane].push(interval);
    lanes.set(id, laneOffset + lane);
  }

  return laneIntervals.length;
}

export function assignLanes(
  items: RoadmapItem[],
  getDotWidthMs: (item: RoadmapItem) => number,
  { longestFirst = false }: { longestFirst?: boolean } = {},
): LaneAssignment {
  const toEntry = (item: RoadmapItem) => {
    const start = new Date(item.startDate).getTime();
    const end = isDotItem(item)
      ? start + getDotWidthMs(item)
      : new Date(item.endDate).getTime();
    return {
      id: item.id,
      interval: { start, end },
      createdAt: item.createdAt
        ? new Date(item.createdAt).getTime()
        : Number.POSITIVE_INFINITY,
    };
  };

  type Entry = ReturnType<typeof toEntry>;

  const chronological = (a: Entry, b: Entry) =>
    a.interval.start - b.interval.start || b.interval.end - a.interval.end;

  const byCreatedAt = (a: Entry, b: Entry) =>
    a.createdAt === b.createdAt
      ? chronological(a, b)
      : a.createdAt - b.createdAt;

  const timed = items
    .filter((item) => !isDotItem(item))
    .map(toEntry)
    .sort(
      longestFirst
        ? (a, b) =>
            b.interval.end -
              b.interval.start -
              (a.interval.end - a.interval.start) || byCreatedAt(a, b)
        : byCreatedAt,
    );
  const dots = items.filter(isDotItem).map(toEntry).sort(byCreatedAt);

  const lanes = new Map<string, number>();
  const timedLaneCount = packIntoLanes(timed, lanes, 0);
  const dotLaneCount = packIntoLanes(dots, lanes, timedLaneCount);

  return { lanes, laneCount: Math.max(1, timedLaneCount + dotLaneCount) };
}
