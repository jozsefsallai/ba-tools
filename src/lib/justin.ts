import {
  studentStorage,
  type StudentStorageItem,
} from "@/lib/storage/students";
import type { StarLevel, UELevel } from "@/lib/types";
import type { Student } from "@prisma/client";

export type JustinPlannerCharacterStats = {
  level: string;
  ue_level: string;
  bond: string;
  ex: string;
  basic: string;
  passive: string;
  sub: string;
  gear1: string;
  gear2: string;
  gear3: string;
  star: number;
  ue: number;
};

// This is a partial implementation
export type JustinPlannerCharacterData = {
  id: string;
  name: string;
  current: JustinPlannerCharacterStats;
  target: JustinPlannerCharacterStats;
};

// This is a partial implementation.
export type JustinPlannerExportData = {
  exportVersion: 2;
  characters: JustinPlannerCharacterData[];
};

export function justinToStudentStorageItems(
  students: Student[],
  data: JustinPlannerExportData,
): StudentStorageItem[] {
  const items: StudentStorageItem[] = [];

  for (const chara of data.characters) {
    const student = students.find(
      (s) => s.schaleDbId === Number.parseInt(chara.id, 10),
    );

    if (!student) {
      continue;
    }

    const id = student.id;
    const level = Number.parseInt(chara.current.level, 10);
    const starLevel = chara.current.star === 0 ? undefined : chara.current.star;
    const ueLevel = chara.current.ue === 0 ? undefined : chara.current.ue;
    const bond = Number.parseInt(chara.current.bond, 10);

    items.push({
      id,
      level: Number.isNaN(level) ? undefined : level,
      starLevel: starLevel === undefined ? undefined : (starLevel as StarLevel),
      ueLevel: ueLevel === undefined ? undefined : (ueLevel as UELevel),
      bond: Number.isNaN(bond) ? undefined : bond,
    });
  }

  return items;
}

export function importJustinPlannerData(
  students: Student[],
  data: JustinPlannerExportData,
) {
  const items = justinToStudentStorageItems(students, data);

  for (const item of items) {
    studentStorage.addOrUpdateStudent(item);
  }
}
