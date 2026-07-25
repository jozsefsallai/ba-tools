import { Storage } from "@/lib/storage";
import type { ReportRarity } from "@/lib/student-exp-table";

export type StudentExpCalculatorData = {
  reports: Record<ReportRarity, string>;
  fromLevel: number;
  toLevel: number;
};

type LegacyStudentExpCalculatorData = {
  reports?: Record<ReportRarity, string>;
  maxLevel?: string;
  fromLevel?: number;
  toLevel?: number;
};

function clampLevel(level: number): number {
  return Math.min(90, Math.max(1, Math.round(level)));
}

class StudentExpStorage extends Storage<StudentExpCalculatorData> {
  constructor() {
    super("student_exp");
  }

  get(): StudentExpCalculatorData | null {
    const data = super.get() as LegacyStudentExpCalculatorData | null;
    if (!data) {
      return null;
    }

    let fromLevel = 1;
    let toLevel = 90;

    if (
      typeof data.fromLevel === "number" &&
      typeof data.toLevel === "number"
    ) {
      fromLevel = clampLevel(data.fromLevel);
      toLevel = clampLevel(data.toLevel);
    } else if (typeof data.maxLevel === "string") {
      const parsed = Number.parseInt(data.maxLevel, 10);
      toLevel = Number.isNaN(parsed) ? 90 : clampLevel(parsed);
    }

    if (fromLevel > toLevel) {
      [fromLevel, toLevel] = [toLevel, fromLevel];
    }

    return {
      reports: data.reports ?? { N: "", R: "", SR: "", SSR: "" },
      fromLevel,
      toLevel,
    };
  }
}

export const studentExpStorage = new StudentExpStorage();
