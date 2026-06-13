import type { RosterItem } from "@/app/user/rosters/_components/roster-item-editor";
import {
  type StudentStorageItem,
  studentStorage,
} from "@/lib/storage/students";
import type { StarLevel, UELevel } from "@/lib/types";
import type { Student } from "~prisma";

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
  bond_gear: string;
  book_hp: string;
  book_atk: string;
  book_heal: string;
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

function createDefaultRosterItem(student: Student): RosterItem {
  return {
    student,
    starLevel: student.rarity as StarLevel,
    ueLevel: null,
    level: 1,
    relationshipRank: 1,
    ex: 1,
    basic: 1,
    enhanced: 1,
    sub: 1,
    equipmentSlot1: 0,
    equipmentSlot2: 0,
    equipmentSlot3: 0,
    equipmentSlot4: 0,
    attackLevel: 0,
    hpLevel: 0,
    healLevel: 0,
    featuredBorrowSlot: null,
  };
}

function parseJustinStat(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function justinStatsToRosterFields(
  stats: JustinPlannerCharacterStats,
  defaults: RosterItem,
): Omit<RosterItem, "student"> {
  const starLevel =
    stats.star === 0 ? defaults.starLevel : (stats.star as StarLevel);
  const ueLevel = stats.ue === 0 ? null : (stats.ue as UELevel);

  return {
    starLevel,
    ueLevel,
    level: parseJustinStat(stats.level, defaults.level),
    relationshipRank: parseJustinStat(stats.bond, defaults.relationshipRank),
    ex: parseJustinStat(stats.ex, defaults.ex),
    basic: parseJustinStat(stats.basic, defaults.basic),
    enhanced: parseJustinStat(stats.passive, defaults.enhanced),
    sub: parseJustinStat(stats.sub, defaults.sub),
    equipmentSlot1: parseJustinStat(stats.gear1, defaults.equipmentSlot1),
    equipmentSlot2: parseJustinStat(stats.gear2, defaults.equipmentSlot2),
    equipmentSlot3: parseJustinStat(stats.gear3, defaults.equipmentSlot3),
    equipmentSlot4: parseJustinStat(stats.bond_gear, defaults.equipmentSlot4),
    attackLevel: parseJustinStat(stats.book_atk, defaults.attackLevel),
    hpLevel: parseJustinStat(stats.book_hp, defaults.hpLevel),
    healLevel: parseJustinStat(stats.book_heal, defaults.healLevel),
    featuredBorrowSlot: null,
  };
}

function rosterItemToJustinStats(
  item: RosterItem,
): JustinPlannerCharacterStats {
  return {
    level: String(item.level),
    ue_level: "0",
    bond: String(item.relationshipRank),
    ex: String(item.ex),
    basic: String(item.basic),
    passive: String(item.enhanced),
    sub: String(item.sub),
    gear1: String(item.equipmentSlot1),
    gear2: String(item.equipmentSlot2),
    gear3: String(item.equipmentSlot3),
    bond_gear: String(item.equipmentSlot4),
    book_hp: String(item.hpLevel),
    book_atk: String(item.attackLevel),
    book_heal: String(item.healLevel),
    star: item.starLevel,
    ue: item.ueLevel ?? 0,
  };
}

export function justinToRosterItems(
  students: Student[],
  data: JustinPlannerExportData,
): RosterItem[] {
  const items: RosterItem[] = [];

  for (const chara of data.characters) {
    const student = students.find(
      (s) => s.schaleDbId === Number.parseInt(chara.id, 10),
    );

    if (!student || student.devName === "CH0258_02") {
      continue;
    }

    const defaults = createDefaultRosterItem(student);
    const fields = justinStatsToRosterFields(chara.current, defaults);

    items.push({
      student,
      ...fields,
    });
  }

  return items;
}

export function rosterItemsToJustinPlanner(
  items: RosterItem[],
): JustinPlannerExportData {
  return {
    exportVersion: 2,
    characters: items.map((item) => {
      const stats = rosterItemToJustinStats(item);

      return {
        id: String(item.student.schaleDbId),
        name: item.student.name,
        current: stats,
        target: stats,
      };
    }),
  };
}
