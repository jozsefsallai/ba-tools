"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "jbat_missionStudentsByDamage";

type StudentIdsByDamage = Record<string, string[]>;

function read(): StudentIdsByDamage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function useTeamStudents() {
  const [ids, setIds] = useState<StudentIdsByDamage>({});

  useEffect(() => {
    setIds(read());
  }, []);

  const setStudent = useCallback(
    (damage: string, slot: number, studentId: string | null) => {
      setIds((current) => {
        const list = [
          ...(current[damage] ?? []),
        ];

        while (list.length <= slot) {
          list.push("");
        }

        list[slot] = studentId ?? "";

        while (list.length > 0 && !list[list.length - 1]) {
          list.pop();
        }

        const next = {
          ...current,
          [damage]: list,
        };

        if (list.length === 0) {
          delete next[damage];
        }

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }

        return next;
      });
    },
    [],
  );

  const studentId = useCallback(
    (damage: string, slot: number): string | null =>
      ids[damage]?.[slot] || null,
    [
      ids,
    ],
  );

  return {
    studentId,
    setStudent,
  };
}
