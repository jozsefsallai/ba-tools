import type { StudentItem } from "@/app/formation-display/_components/formation-preview";
import type { StarLevel, Student, UELevel } from "@/lib/types";
import { v4 as uuid } from "uuid";

/** Persisted formation slot shape (Convex / API). */
export type PersistedFormationStudentSlot = {
  studentId?: string;
  starter?: boolean;
  starLevel?: StarLevel;
  ueLevel?: UELevel;
  borrowed?: boolean;
  level?: number;
};

export function persistedSlotsToStudentItems(
  slots: PersistedFormationStudentSlot[],
  allStudents: Student[],
): StudentItem[] {
  const output: StudentItem[] = [];

  for (const item of slots) {
    const student = allStudents.find((s) => s.id === item.studentId);

    if (student) {
      output.push({
        id: uuid(),
        student,
        starter: item.starter,
        starLevel: item.starLevel,
        ueLevel: item.ueLevel,
        borrowed: item.borrowed,
        level: item.level,
      });
    } else {
      output.push({
        id: uuid(),
      });
    }
  }

  return output;
}

export function studentItemsToPersistedSlots(items: StudentItem[]) {
  return items.map((item) => ({
    studentId: item.student?.id,
    starter: item.starter,
    starLevel: item.starLevel,
    ueLevel: item.ueLevel,
    borrowed: item.borrowed,
    level: item.level,
  }));
}
