"use client";

import { useStudents } from "@/hooks/use-students";
import type { BirthdaySource } from "@/lib/roadmap/layout";
import { useMemo } from "react";

export function useBirthdaySources(): BirthdaySource[] {
  const { students } = useStudents();

  return useMemo(
    () =>
      students
        .filter((student) => student.baseVariantId === null)
        .map((student) => ({
          id: student.id,
          name: student.name,
          rarity: student.rarity,
          isFestGlobal: student.isFestGlobal,
          isLimitedGlobal: student.isLimitedGlobal,
          birthday: student.birthday,
        })),
    [students],
  );
}
