"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { BirthdayGiftPreference } from "@/app/birthdays/_components/birthdays-view";
import type { BirthdayStudent } from "@/lib/birthdays";
import { buildItemIconUrl, buildStudentIconUrlFromId } from "@/lib/url";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type BirthdayCellProps = {
  month: number;
  day: number;
  students: BirthdayStudent[];
  isToday: boolean;
  favoriteGiftsByStudentId: Record<string, BirthdayGiftPreference[]>;
};

type StudentFavoriteGiftPreviewProps = {
  studentId: string;
  favoriteGiftsByStudentId: Record<string, BirthdayGiftPreference[]>;
};

function StudentFavoriteGiftPreview({
  studentId,
  favoriteGiftsByStudentId,
}: StudentFavoriteGiftPreviewProps) {
  const favorites = favoriteGiftsByStudentId[studentId] ?? [];
  const firstGift = favorites[0];
  if (!firstGift) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      <img
        src={buildItemIconUrl(firstGift.iconName)}
        alt={firstGift.name}
        className="w-10"
      />

      {favorites.length > 1 && (
        <span className="text-xs font-semibold text-muted-foreground">
          +{favorites.length - 1}
        </span>
      )}
    </div>
  );
}

export function BirthdayCell({
  month,
  day,
  students,
  isToday,
  favoriteGiftsByStudentId,
}: BirthdayCellProps) {
  const t = useTranslations();
  const hasBirthdays = students.length > 0;
  const primaryStudent = students[0];
  const remainingCount = students.length - 1;
  const desktopVisibleStudents = students.slice(0, 3);
  const desktopRemainingCount = students.length - desktopVisibleStudents.length;

  const content = (
    <div
      className={cn(
        "min-h-[72px] rounded-md border p-1.5 transition-colors sm:min-h-[92px] sm:p-2",
        hasBirthdays &&
          "bg-pink-50/40 hover:bg-pink-100/40 dark:bg-pink-950/20",
        !hasBirthdays && "bg-muted/20",
        isToday && "ring-primary ring-2 ring-offset-1",
      )}
    >
      <div className="text-xs font-semibold">{day}</div>

      {hasBirthdays && (
        <div className="mt-1.5 sm:mt-2">
          <div className="relative inline-flex sm:hidden">
            <img
              src={buildStudentIconUrlFromId(primaryStudent.student.id)}
              alt={primaryStudent.student.name}
              className="size-8 rounded-full border-2 border-background bg-background object-cover shadow-sm"
            />
            {remainingCount > 0 && (
              <span className="absolute -right-1 -bottom-1 rounded-full border bg-background px-1 py-0.5 text-[9px] font-bold leading-none text-muted-foreground">
                +{remainingCount}
              </span>
            )}
          </div>

          <div className="hidden items-center sm:flex">
            {desktopVisibleStudents.map((row, index) => (
              <img
                key={row.student.id}
                src={buildStudentIconUrlFromId(row.student.id)}
                alt={row.student.name}
                className={cn(
                  "size-10 rounded-full border-2 border-background bg-background object-cover shadow-sm",
                  index > 0 && "-ml-6",
                )}
              />
            ))}
            {desktopRemainingCount > 0 && (
              <span className="ml-1 text-xs font-semibold text-muted-foreground">
                +{desktopRemainingCount}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (!hasBirthdays) {
    return content;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full text-left"
          aria-label={t("tools.birthdays.cell.ariaLabel", {
            count: students.length,
            month,
            day,
          })}
        >
          {content}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-3" align="start">
        <div className="mb-2 text-sm font-semibold">
          {t("tools.birthdays.cell.popoverHeader", { month, day })}
        </div>
        <div className="space-y-2">
          {students.map((row) => (
            <div
              key={row.student.id}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <img
                  src={buildStudentIconUrlFromId(row.student.id)}
                  alt={row.student.name}
                  className="size-10 rounded-full border object-cover"
                />
                <div className="text-sm">{row.student.name}</div>
              </div>

              <StudentFavoriteGiftPreview
                studentId={row.student.id}
                favoriteGiftsByStudentId={favoriteGiftsByStudentId}
              />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
