import { STUDENT_MAX_LEVEL, getStudentStatsAtLevel } from "@/lib/student-stats";
import { type TerrainGrade, getTerrainGrade } from "@/lib/terrain";
import type { Student } from "~prisma";

export type SortDirection = "asc" | "desc";

type SortDefinition =
  | {
      kind: "order";
      direction: SortDirection;
    }
  | {
      kind: "name";
      direction: SortDirection;
    }
  | {
      kind: "number";
      direction: SortDirection;
      value: (student: Student) => number;
      format?: "rarity" | "percent";
    }
  | {
      kind: "terrain";
      direction: SortDirection;
      field:
        | "streetBattleAdaptation"
        | "outdoorBattleAdaptation"
        | "indoorBattleAdaptation";
    };

// Base stats are compared at the max level and the student's own star level,
// like the profile page shows by default.
const lv90Cache = new WeakMap<
  Student,
  ReturnType<typeof getStudentStatsAtLevel>
>();

function getLv90Stats(student: Student) {
  let stats = lv90Cache.get(student);
  if (!stats) {
    stats = getStudentStatsAtLevel(
      {
        maxHP: [student.maxHPLevel1, student.maxHPLevel100],
        atk: [student.atkLevel1, student.atkLevel100],
        def: [student.defLevel1, student.defLevel100],
        heal: [student.healLevel1, student.healLevel100],
      },
      STUDENT_MAX_LEVEL,
      student.rarity,
    );
    lv90Cache.set(student, stats);
  }

  return stats;
}

export const SORT_DEFINITIONS = {
  default: {
    kind: "order",
    direction: "asc",
  },

  name: {
    kind: "name",
    direction: "asc",
  },

  rarity: {
    kind: "number",
    direction: "desc",
    value: (s) => s.rarity,
    format: "rarity",
  },

  urban: {
    kind: "terrain",
    direction: "desc",
    field: "streetBattleAdaptation",
  },

  outdoor: {
    kind: "terrain",
    direction: "desc",
    field: "outdoorBattleAdaptation",
  },

  indoor: {
    kind: "terrain",
    direction: "desc",
    field: "indoorBattleAdaptation",
  },

  atk: {
    kind: "number",
    direction: "desc",
    value: (s) => getLv90Stats(s).atk,
  },

  maxHP: {
    kind: "number",
    direction: "desc",
    value: (s) => getLv90Stats(s).maxHP,
  },

  def: {
    kind: "number",
    direction: "desc",
    value: (s) => getLv90Stats(s).def,
  },

  heal: {
    kind: "number",
    direction: "desc",
    value: (s) => getLv90Stats(s).heal,
  },

  stability: {
    kind: "number",
    direction: "desc",
    value: (s) => s.stability,
  },

  evasion: {
    kind: "number",
    direction: "desc",
    value: (s) => s.evasion,
  },

  accuracy: {
    kind: "number",
    direction: "desc",
    value: (s) => s.accuracy,
  },

  crit: {
    kind: "number",
    direction: "desc",
    value: (s) => s.crit,
  },

  critDamage: {
    kind: "number",
    direction: "desc",
    value: (s) => s.critDamagePercent,
    format: "percent",
  },

  range: {
    kind: "number",
    direction: "desc",
    value: (s) => s.range,
  },
} as const satisfies Record<string, SortDefinition>;

export type SortKey = keyof typeof SORT_DEFINITIONS;
export const SORT_KEYS = Object.keys(SORT_DEFINITIONS) as SortKey[];

export function getDefaultSortDirection(key: SortKey): SortDirection {
  return SORT_DEFINITIONS[key].direction;
}

function getSortValue(student: Student, key: SortKey): number | string {
  const definition: SortDefinition = SORT_DEFINITIONS[key];

  switch (definition.kind) {
    case "order":
      return student.defaultOrder;
    case "name":
      return student.name;
    case "number":
      return definition.value(student);
    case "terrain":
      return student[definition.field];
  }
}

export function sortStudents(
  students: Student[],
  key: SortKey,
  direction: SortDirection,
) {
  const factor = direction === "asc" ? 1 : -1;

  return students.slice().sort((a, b) => {
    const left = getSortValue(a, key);
    const right = getSortValue(b, key);

    const compared =
      typeof left === "string" && typeof right === "string"
        ? left.localeCompare(right)
        : (left as number) - (right as number);

    return compared * factor || a.defaultOrder - b.defaultOrder;
  });
}

export type SortDisplayValue =
  | { kind: "text"; text: string }
  | { kind: "terrain"; grade: TerrainGrade };

export function getSortDisplayValue(
  student: Student,
  key: SortKey,
  numberFormat: Intl.NumberFormat,
): SortDisplayValue | null {
  const definition: SortDefinition = SORT_DEFINITIONS[key];

  switch (definition.kind) {
    case "order":
    case "name":
      return null;
    case "terrain":
      return {
        kind: "terrain",
        grade: getTerrainGrade(student[definition.field]),
      };
    case "number": {
      const value = definition.value(student);

      if (definition.format === "rarity") {
        return { kind: "text", text: "★".repeat(value) };
      }

      if (definition.format === "percent") {
        return { kind: "text", text: `${numberFormat.format(value / 100)}%` };
      }

      return { kind: "text", text: numberFormat.format(value) };
    }
  }
}
