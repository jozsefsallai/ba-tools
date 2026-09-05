import type { StudentItem } from "@/app/formation-display/_components/formation-preview";
import { hexToRgba } from "@/lib/canvas";
import type { StarLevel, Student, UELevel } from "@/lib/types";
import { v4 as uuid } from "uuid";

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

export const DEFAULT_NEW_FORMATION_STUDENT_LEVEL = 90;
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
