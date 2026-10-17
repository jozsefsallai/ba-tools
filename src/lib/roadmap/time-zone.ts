export type RoadmapTimeZone = "utc" | "local";

export function intlTimeZone(tz: RoadmapTimeZone): string | undefined {
  return tz === "utc" ? "UTC" : undefined;
}

type CalendarDate = { year: number; month: number; day: number };

export function calendarDate(
  date: Date | string | number,
  tz: RoadmapTimeZone,
): CalendarDate {
  const d = new Date(date);
  return tz === "utc"
    ? { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() }
    : { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

export function fromCalendarDate(
  { year, month, day }: CalendarDate,
  tz: RoadmapTimeZone,
): Date {
  return tz === "utc"
    ? new Date(Date.UTC(year, month, day))
    : new Date(year, month, day);
}

export function startOfDay(
  date: Date | string | number,
  tz: RoadmapTimeZone,
): Date {
  return fromCalendarDate(calendarDate(date, tz), tz);
}

export function addCalendarDays(
  date: Date | string | number,
  days: number,
  tz: RoadmapTimeZone,
): Date {
  const { year, month, day } = calendarDate(date, tz);
  return fromCalendarDate({ year, month, day: day + days }, tz);
}

export function startOfMonth(
  date: Date | string | number,
  tz: RoadmapTimeZone,
  months = 0,
): Date {
  const { year, month } = calendarDate(date, tz);
  return fromCalendarDate({ year, month: month + months, day: 1 }, tz);
}

export function dayOfWeek(date: Date, tz: RoadmapTimeZone): number {
  return tz === "utc" ? date.getUTCDay() : date.getDay();
}

export function toUTCCalendarDay(date: Date, tz: RoadmapTimeZone): Date {
  return fromCalendarDate(calendarDate(date, tz), "utc");
}
