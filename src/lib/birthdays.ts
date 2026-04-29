import type { Student } from "~prisma";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const MONTH_TRANSLATION_KEYS = [
  "tools.birthdays.months.january",
  "tools.birthdays.months.february",
  "tools.birthdays.months.march",
  "tools.birthdays.months.april",
  "tools.birthdays.months.may",
  "tools.birthdays.months.june",
  "tools.birthdays.months.july",
  "tools.birthdays.months.august",
  "tools.birthdays.months.september",
  "tools.birthdays.months.october",
  "tools.birthdays.months.november",
  "tools.birthdays.months.december",
] as const;

export const MONTH_ACCENTS = [
  "from-sky-200/60 to-cyan-200/50 dark:from-sky-900/30 dark:to-cyan-900/20",
  "from-pink-200/60 to-rose-200/50 dark:from-pink-900/30 dark:to-rose-900/20",
  "from-emerald-200/60 to-lime-200/50 dark:from-emerald-900/30 dark:to-lime-900/20",
  "from-rose-200/60 to-fuchsia-200/45 dark:from-rose-900/30 dark:to-fuchsia-900/20",
  "from-violet-200/60 to-purple-200/50 dark:from-violet-900/30 dark:to-purple-900/20",
  "from-orange-200/55 to-amber-200/50 dark:from-orange-900/30 dark:to-amber-900/20",
  "from-teal-200/55 to-cyan-200/50 dark:from-teal-900/30 dark:to-cyan-900/20",
  "from-yellow-200/60 to-orange-200/45 dark:from-yellow-900/30 dark:to-orange-900/20",
  "from-green-200/60 to-emerald-200/50 dark:from-green-900/30 dark:to-emerald-900/20",
  "from-amber-200/60 to-red-200/45 dark:from-amber-900/30 dark:to-red-900/20",
  "from-stone-200/70 to-orange-200/40 dark:from-stone-800/50 dark:to-orange-900/20",
  "from-cyan-200/60 to-blue-200/50 dark:from-cyan-900/30 dark:to-blue-900/20",
] as const;

export type ParsedBirthday = {
  month: number;
  day: number;
};

export type BirthdayStudent = {
  student: Student;
  month: number;
  day: number;
  key: string;
};

export function parseBirthday(input: string): ParsedBirthday | null {
  const match = input.trim().match(/^([A-Za-z]+)\s+(\d{1,2})/);
  if (!match) {
    return null;
  }

  const monthName = match[1].toLowerCase();
  const monthIndex = MONTH_NAMES.findIndex(
    (item) => item.toLowerCase() === monthName,
  );
  if (monthIndex < 0) {
    return null;
  }

  const day = Number(match[2]);
  if (!Number.isFinite(day) || day < 1 || day > 31) {
    return null;
  }

  return {
    month: monthIndex + 1,
    day,
  };
}

export function birthdayKey(month: number, day: number) {
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function extractBirthdayStudents(students: Student[]) {
  const rows: BirthdayStudent[] = [];
  for (const student of students) {
    const parsed = parseBirthday(student.birthday);
    if (!parsed) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[birthdays] unparseable birthday: ${student.birthday}`);
      }
      continue;
    }

    rows.push({
      student,
      month: parsed.month,
      day: parsed.day,
      key: birthdayKey(parsed.month, parsed.day),
    });
  }

  return rows;
}

export function groupStudentsByDate(students: BirthdayStudent[]) {
  const map = new Map<string, BirthdayStudent[]>();

  for (const row of students) {
    const current = map.get(row.key) ?? [];
    current.push(row);
    map.set(row.key, current);
  }

  return map;
}

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function resolveBirthdayDate(year: number, month: number, day: number) {
  if (month === 2 && day === 29) {
    if (!isLeapYear(year)) {
      return null;
    }
  }

  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function daysUntilNextBirthday(month: number, day: number, now: Date) {
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let year = nowStart.getFullYear();
  let target = resolveBirthdayDate(year, month, day);

  while (!target || target < nowStart) {
    year += 1;
    target = resolveBirthdayDate(year, month, day);
  }

  return Math.round((target.getTime() - nowStart.getTime()) / 86400000);
}
