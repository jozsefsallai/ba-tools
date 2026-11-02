/** Match Trigger job convention: start 02:00:00 UTC, end 01:59:59 UTC. */

export function toBannerStartDate(
  year: number,
  month: number,
  day: number,
): Date {
  return new Date(Date.UTC(year, month - 1, day, 2, 0, 0));
}

export function toBannerEndDate(
  year: number,
  month: number,
  day: number,
): Date {
  return new Date(Date.UTC(year, month - 1, day, 1, 59, 59));
}

export function toBannerStartFromCalendar(date: Date): Date {
  return toBannerStartDate(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
}

export function toBannerEndFromCalendar(date: Date): Date {
  return toBannerEndDate(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
}

export function calendarDateFromBannerTimestamp(value: string | Date): Date {
  const d = new Date(value);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function bannerGroupKey(
  start: string | Date | number,
  end: string | Date | number,
): string {
  return `${new Date(start).getTime()},${new Date(end).getTime()}`;
}

export function parseBannerGroupKey(key: string): [
  number,
  number,
] {
  const [start, end] = key.split(",").map((part) => Number.parseInt(part, 10));
  return [
    start,
    end,
  ];
}

export function offsetBannerDate(date: Date, offsetDays: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + offsetDays);
  return next;
}
