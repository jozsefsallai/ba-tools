"use client";

import { FilterBar } from "@/app/birthdays/_components/filter-bar";
import { MonthCard } from "@/app/birthdays/_components/month-card";
import { TodaySpotlight } from "@/app/birthdays/_components/today-spotlight";
import { UpcomingStrip } from "@/app/birthdays/_components/upcoming-strip";
import {
  birthdayKey,
  daysUntilNextBirthday,
  extractBirthdayStudents,
  groupStudentsByDate,
  MONTH_TRANSLATION_KEYS,
} from "@/lib/birthdays";
import { useStudents } from "@/hooks/use-students";
import { buildStudentIconUrlFromId } from "@/lib/url";
import type { ItemRarity } from "~prisma";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

const MONTH_NUMBERS = Array.from({ length: 12 }, (_, index) => index + 1);

export type BirthdayGiftPreference = {
  id: number;
  iconName: string;
  name: string;
  nameJP: string;
  rarity: ItemRarity;
  preference: "adored" | "loved" | "liked";
};

type BirthdaysViewProps = {
  favoriteGiftsByStudentId: Record<string, BirthdayGiftPreference[]>;
};

export function BirthdaysView({
  favoriteGiftsByStudentId,
}: BirthdaysViewProps) {
  const { students } = useStudents();
  const t = useTranslations();

  const [search, setSearch] = useState("");
  const today = new Date();
  const currentYear = today.getFullYear();
  const normalizedSearch = search.trim().toLowerCase();

  const birthdayStudents = useMemo(
    () =>
      extractBirthdayStudents(
        students.filter((student) => student.baseVariantId === null),
      ),
    [students],
  );

  const searchResults = useMemo(() => {
    if (!normalizedSearch) {
      return [];
    }
    return birthdayStudents
      .filter((row) =>
        row.student.name.toLowerCase().includes(normalizedSearch),
      )
      .slice(0, 12);
  }, [birthdayStudents, normalizedSearch]);

  const birthdaysByDate = useMemo(
    () => groupStudentsByDate(birthdayStudents),
    [birthdayStudents],
  );

  const todayKey = birthdayKey(today.getMonth() + 1, today.getDate());
  const todayBirthdays = birthdaysByDate.get(todayKey) ?? [];

  const upcomingBirthdays = useMemo(() => {
    return birthdayStudents
      .slice()
      .sort((a, b) => {
        const deltaA = daysUntilNextBirthday(a.month, a.day, today);
        const deltaB = daysUntilNextBirthday(b.month, b.day, today);
        if (deltaA !== deltaB) {
          return deltaA - deltaB;
        }
        return a.student.name.localeCompare(b.student.name);
      })
      .slice(0, 10);
  }, [birthdayStudents, today]);

  if (students.length === 0) {
    return <div className="h-56 animate-pulse rounded-xl border bg-muted/30" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <FilterBar search={search} onSearchChange={setSearch} />

      {normalizedSearch.length > 0 && (
        <section className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">
              {t("tools.birthdays.search.title")}
            </h2>
            <div className="text-sm text-muted-foreground">
              {t("tools.birthdays.search.matches", {
                count: searchResults.length,
              })}
            </div>
          </div>

          {searchResults.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {searchResults.map((row) => (
                <div
                  key={`search-${row.student.id}`}
                  className="w-full sm:w-44 rounded-lg border bg-background p-3"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <img
                      src={buildStudentIconUrlFromId(row.student.id)}
                      alt={row.student.name}
                      className="size-9 rounded-full border object-cover"
                    />
                    <div className="text-sm font-medium leading-tight">
                      {row.student.name}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {row.month}/{row.day}
                  </div>
                  <div className="text-xs text-pink-500">
                    {t("tools.birthdays.upcoming.inDays", {
                      count: daysUntilNextBirthday(row.month, row.day, today),
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {t("tools.birthdays.search.noMatches")}
            </div>
          )}
        </section>
      )}

      {todayBirthdays.length > 0 && (
        <TodaySpotlight
          todayBirthdays={todayBirthdays}
          favoriteGiftsByStudentId={favoriteGiftsByStudentId}
        />
      )}

      <UpcomingStrip students={upcomingBirthdays} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t("tools.birthdays.calendarTitle")}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MONTH_NUMBERS.map((month, index) => (
            <motion.div
              key={month}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02, duration: 0.25 }}
            >
              <MonthCard
                month={month}
                monthName={t(MONTH_TRANSLATION_KEYS[month - 1])}
                birthdaysByDate={birthdaysByDate}
                todayKey={todayKey}
                year={currentYear}
                isCurrentMonth={month === today.getMonth() + 1}
                favoriteGiftsByStudentId={favoriteGiftsByStudentId}
              />
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
