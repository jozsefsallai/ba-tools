import { v4 as uuid } from "uuid";
import type { StudentItem } from "@/app/[locale]/formation-display/_components/formation-preview";
import { hexToRgba } from "@/lib/canvas";
import type { FormationType } from "@/lib/formation-type";
import type { StarLevel, Student, UELevel } from "@/lib/types";

/** Persisted formation slot shape (Convex / API). */
export type PersistedFormationStudentSlot = {
  studentId?: string;
  starter?: boolean;
  starterOrder?: number;
  starLevel?: StarLevel;
  ueLevel?: UELevel;
  borrowed?: boolean;
  level?: number;
};

export type FormationRowLabelSide = "left" | "right";

export type FormationRowLabel = {
  text: string;
  side: FormationRowLabelSide;
  fontSize?: number;
  color?: string;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowOpacity?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowBlur?: number;
  shadowSpread?: number;
  distance?: number;
};

export type FormationRowLabelDefaults = Required<FormationRowLabel>;

export const DEFAULT_NEW_FORMATION_STUDENT_STAR_LEVEL: StarLevel = 3;

export const DEFAULT_FORMATIONATION_ROW_LABEL: FormationRowLabelDefaults = {
  text: "",
  side: "right",
  fontSize: 24,
  color: "#ffffff",
  shadowEnabled: true,
  shadowColor: "#000000",
  shadowOpacity: 100,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowBlur: 0,
  shadowSpread: 1,
  distance: 16,
};

export function createDefaultFormationRowLabel(
  overrides?: Partial<FormationRowLabel>,
): FormationRowLabelDefaults {
  return {
    ...DEFAULT_FORMATIONATION_ROW_LABEL,
    ...overrides,
  };
}

export function formationRowLabelTextShadow(
  label: Pick<
    FormationRowLabel,
    | "shadowColor"
    | "shadowOpacity"
    | "shadowOffsetX"
    | "shadowOffsetY"
    | "shadowBlur"
    | "shadowSpread"
  > = {},
): string {
  const color =
    label.shadowColor ?? DEFAULT_FORMATIONATION_ROW_LABEL.shadowColor;
  const opacity =
    label.shadowOpacity ?? DEFAULT_FORMATIONATION_ROW_LABEL.shadowOpacity;
  const offsetX =
    label.shadowOffsetX ?? DEFAULT_FORMATIONATION_ROW_LABEL.shadowOffsetX;
  const offsetY =
    label.shadowOffsetY ?? DEFAULT_FORMATIONATION_ROW_LABEL.shadowOffsetY;
  const blur = label.shadowBlur ?? DEFAULT_FORMATIONATION_ROW_LABEL.shadowBlur;
  const spread =
    label.shadowSpread ?? DEFAULT_FORMATIONATION_ROW_LABEL.shadowSpread;

  const rgba = hexToRgba(color, opacity);
  const layers: string[] = [];

  // CSS text-shadow has no spread; approximate outline thickness with directional offsets.
  if (spread > 0) {
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const x = Math.round(Math.cos(angle) * spread * 100) / 100;
      const y = Math.round(Math.sin(angle) * spread * 100) / 100;
      layers.push(`${x}px ${y}px 0px ${rgba}`);
    }
  }

  if (offsetX !== 0 || offsetY !== 0 || blur > 0 || spread <= 0) {
    layers.push(`${offsetX}px ${offsetY}px ${blur}px ${rgba}`);
  }

  return layers.join(", ");
}

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
        starterOrder: item.starterOrder,
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
    starterOrder: item.starterOrder,
    starLevel: item.starLevel,
    ueLevel: item.ueLevel,
    borrowed: item.borrowed,
    level: item.level,
  }));
}

export type FormationEditorRow = {
  id: string;
  strikers: StudentItem[];
  specials: StudentItem[];
  tcs: StudentItem[];
  label?: FormationRowLabel;
};

function compareFormationRowLabels(
  a: FormationRowLabel | undefined,
  b: FormationRowLabel | undefined,
): boolean {
  if (!a && !b) {
    return true;
  }

  if (!a || !b) {
    return false;
  }

  return (
    a.text === b.text &&
    a.side === b.side &&
    a.fontSize === b.fontSize &&
    a.color === b.color &&
    a.shadowEnabled === b.shadowEnabled &&
    a.shadowColor === b.shadowColor &&
    a.shadowOpacity === b.shadowOpacity &&
    a.shadowOffsetX === b.shadowOffsetX &&
    a.shadowOffsetY === b.shadowOffsetY &&
    a.shadowBlur === b.shadowBlur &&
    a.shadowSpread === b.shadowSpread &&
    a.distance === b.distance
  );
}

function compareStudentItems(a: StudentItem[], b: StudentItem[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; ++i) {
    const itemA = a[i];
    const itemB = b[i];

    if (itemA.student?.id !== itemB.student?.id) {
      return false;
    }

    if (itemA.starter !== itemB.starter) {
      return false;
    }

    if (itemA.starterOrder !== itemB.starterOrder) {
      return false;
    }

    if (itemA.starLevel !== itemB.starLevel) {
      return false;
    }

    if (itemA.ueLevel !== itemB.ueLevel) {
      return false;
    }

    if (itemA.borrowed !== itemB.borrowed) {
      return false;
    }

    if (itemA.level !== itemB.level) {
      return false;
    }
  }

  return true;
}

export function compareFormationRows(
  a: FormationEditorRow[],
  b: FormationEditorRow[],
): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; ++i) {
    if (
      !compareStudentItems(a[i].strikers, b[i].strikers) ||
      !compareStudentItems(a[i].specials, b[i].specials) ||
      !compareStudentItems(a[i].tcs, b[i].tcs) ||
      !compareFormationRowLabels(a[i].label, b[i].label)
    ) {
      return false;
    }
  }

  return true;
}

export type PersistedFormationRow = {
  strikers: PersistedFormationStudentSlot[];
  specials: PersistedFormationStudentSlot[];
  tcs?: PersistedFormationStudentSlot[];
  label?: FormationRowLabel;
};

export function formationDocToRows(
  doc: {
    strikers?: PersistedFormationStudentSlot[];
    specials?: PersistedFormationStudentSlot[];
    rows?: PersistedFormationRow[];
  },
  allStudents: Student[],
): FormationEditorRow[] {
  const sources: PersistedFormationRow[] =
    doc.rows && doc.rows.length > 0
      ? doc.rows
      : [
          {
            strikers: doc.strikers ?? [],
            specials: doc.specials ?? [],
          },
        ];

  return sources.map((row) => ({
    id: uuid(),
    strikers: persistedSlotsToStudentItems(row.strikers, allStudents),
    specials: persistedSlotsToStudentItems(row.specials, allStudents),
    tcs: persistedSlotsToStudentItems(row.tcs ?? [], allStudents),
    ...(row.label
      ? {
          label: createDefaultFormationRowLabel(row.label),
        }
      : {}),
  }));
}

export function formationRowsToPayload(
  rows: FormationEditorRow[],
  formationType: FormationType | undefined,
) {
  return rows.map((row) => ({
    strikers: studentItemsToPersistedSlots(row.strikers),
    specials: studentItemsToPersistedSlots(row.specials),
    ...(formationType === "tacticalRelay" && row.tcs.length > 0
      ? {
          tcs: studentItemsToPersistedSlots(row.tcs),
        }
      : {}),
    ...(row.label?.text
      ? {
          label: {
            text: row.label.text,
            side: row.label.side,
            fontSize: row.label.fontSize,
            color: row.label.color,
            shadowEnabled: row.label.shadowEnabled,
            shadowColor: row.label.shadowColor,
            shadowOpacity: row.label.shadowOpacity,
            shadowOffsetX: row.label.shadowOffsetX,
            shadowOffsetY: row.label.shadowOffsetY,
            shadowBlur: row.label.shadowBlur,
            shadowSpread: row.label.shadowSpread,
            distance: row.label.distance,
          },
        }
      : {}),
  }));
}
