"use client";

import type { BirthdayStudent } from "@/lib/birthdays";
import { daysUntilNextBirthday } from "@/lib/birthdays";
import { buildStudentIconUrlFromId } from "@/lib/url";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";

type UpcomingStripProps = {
  students: BirthdayStudent[];
};

export function UpcomingStrip({ students }: UpcomingStripProps) {
  const t = useTranslations();
  const now = new Date();

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <CalendarIcon className="size-4 text-blue-400" />
        <h2 className="font-semibold">{t("tools.birthdays.upcoming.title")}</h2>
      </div>

      <div className="flex flex-wrap gap-3">
        {students.map((row, index) => {
          const delta = daysUntilNextBirthday(row.month, row.day, now);
          const isToday = delta === 0;
          const isTomorrow = delta === 1;
          const isVerySoon = delta <= 3;
          let relativeLabel = t("tools.birthdays.upcoming.inDays", {
            count: delta,
          });
          if (isToday) {
            relativeLabel = t("tools.birthdays.upcoming.today");
          } else if (isTomorrow) {
            relativeLabel = t("tools.birthdays.upcoming.tomorrow");
          }

          return (
            <motion.div
              key={`${row.student.id}-${row.key}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.25 }}
              className={cn(
                "relative w-full sm:w-44 rounded-lg border bg-background p-3 transition-all",
                isVerySoon && "shadow-md",
                isTomorrow &&
                  "border-amber-400/70 bg-amber-50/40 dark:bg-amber-950/20",
                isToday &&
                  "border-pink-500 bg-pink-50/60 shadow-pink-300/30 shadow-lg dark:bg-pink-950/25",
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <img
                  src={buildStudentIconUrlFromId(row.student.id)}
                  alt={row.student.name}
                  className={cn(
                    "size-9 rounded-full border object-cover",
                    isVerySoon && "ring-2 ring-offset-1",
                    isToday && "ring-pink-400",
                    isTomorrow && "ring-amber-400",
                  )}
                />
                <div className="text-sm font-medium">{row.student.name}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                {row.month}/{row.day}
              </div>
              <div className="text-xs text-pink-500">{relativeLabel}</div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
