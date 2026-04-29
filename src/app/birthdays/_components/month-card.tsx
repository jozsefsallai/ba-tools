"use client";

import { BirthdayCell } from "@/app/birthdays/_components/birthday-cell";
import type { BirthdayGiftPreference } from "@/app/birthdays/_components/birthdays-view";
import type { BirthdayStudent } from "@/lib/birthdays";
import { birthdayKey, MONTH_ACCENTS } from "@/lib/birthdays";
import { cn } from "@/lib/utils";
import { getDay, getDaysInMonth } from "date-fns";

type MonthCardProps = {
  month: number;
  monthName: string;
  birthdaysByDate: Map<string, BirthdayStudent[]>;
  todayKey: string;
  year: number;
  isCurrentMonth: boolean;
  favoriteGiftsByStudentId: Record<string, BirthdayGiftPreference[]>;
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export function MonthCard({
  month,
  monthName,
  birthdaysByDate,
  todayKey,
  year,
  isCurrentMonth,
  favoriteGiftsByStudentId,
}: MonthCardProps) {
  const firstDayOffset = getDay(new Date(year, month - 1, 1));
  const dayCount = getDaysInMonth(new Date(year, month - 1, 1));

  let monthBirthdayCount = 0;
  for (let day = 1; day <= dayCount; day += 1) {
    const items = birthdaysByDate.get(birthdayKey(month, day));
    monthBirthdayCount += items?.length ?? 0;
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card/80 shadow-sm backdrop-blur",
        isCurrentMonth && "bg-primary/5",
      )}
    >
      <div
        className={cn(
          "rounded-t-xl bg-gradient-to-r px-3 py-2",
          MONTH_ACCENTS[month - 1],
          isCurrentMonth && "bg-primary/10",
        )}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{monthName}</h3>
          <span className="text-xs text-muted-foreground">
            {monthBirthdayCount}
          </span>
        </div>
      </div>

      <div className="p-2">
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[360px] sm:min-w-0">
            <div className="mb-2 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((label, index) => (
                <div
                  key={`${label}-${index}`}
                  className="text-muted-foreground text-center text-[11px] font-medium"
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOffset }, (_, index) => (
                <div key={`empty-${month}-${index}`} />
              ))}

              {Array.from({ length: dayCount }, (_, index) => {
                const day = index + 1;
                const key = birthdayKey(month, day);
                return (
                  <BirthdayCell
                    key={key}
                    month={month}
                    day={day}
                    students={birthdaysByDate.get(key) ?? []}
                    isToday={todayKey === key}
                    favoriteGiftsByStudentId={favoriteGiftsByStudentId}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
