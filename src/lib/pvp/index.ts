import type { PvpIconCardKind } from "@/lib/pvp/icon-card";
import type { PvpIconMatch } from "@/lib/pvp/icon-match";
import type { PvpOpponentNameRecognition } from "@/lib/pvp/opponent-name-types";
import type { Student } from "@/lib/types";

export const PVP_OCR_CONFIDENCE_THRESHOLD = 75;
export type PvpOcrMode = "text" | "digits" | "result";
export type PvpStudentIdentity = Pick<Student, "id" | "name">;
export type PvpUnitPosition = {
  sourceIndex: number;
  combatClass: Student["combatClass"] | null;
};

export type PvpPixelImage = {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
  iconCard?: PvpIconCardKind;
};

export type PvpOcrField<T> = {
  value: T | null;
  rawText: string;
  confidence: number;
  uncertain: boolean;
  crop: PvpPixelImage | null;
  alternatives?: PvpOcrReading[];
};

export type PvpOcrReading = {
  rawText: string;
  confidence: number;
  language: string;
  preprocessing: string;
};

export function getPvpLevelEnd(
  words: { text: string; confidence: number; bbox: { x1: number } }[],
) {
  const prefix = /^Lv[.．]?\p{Nd}+$/iu.test(words[0]?.text ?? "")
    ? words.slice(0, 1)
    : /^Lv[.．]?$/iu.test(words[0]?.text ?? "") &&
        /^\p{Nd}+$/u.test(words[1]?.text ?? "")
      ? words.slice(0, 2)
      : [];

  return prefix.length && prefix.every((word) => word.confidence >= 85)
    ? prefix.at(-1)?.bbox.x1
    : undefined;
}

export function parsePvpOpponentName(text: string): string | null {
  // Remove only the first level label; later labels can belong to the username.
  const level = /Lv\s*[.．]?\s*\p{Nd}+/iu.exec(text);
  if (!level) {
    return null;
  }

  const name = text.slice(level.index + level[0].length).trim();
  return name || null;
}

export type PvpStudentField = PvpOcrField<string> & {
  iconMatch: PvpIconMatch;
};

export type PvpExtractedUnit = PvpUnitPosition & {
  student: PvpStudentField;
  damage: PvpOcrField<number>;
};

export type PvpBattleInfo = {
  battleType: PvpOcrField<"ATTACK" | "DEFENSE">;
  result: PvpOcrField<"WIN" | "LOSE">;
  enemyName: PvpOcrField<string>;
  enemyNameRecognition?: PvpOpponentNameRecognition;
  enemyNameStatus: "named" | "anonymous" | "unknown";
  enemyStudentRep: PvpStudentField;
  myUnits: PvpExtractedUnit[];
  enemyUnits: PvpExtractedUnit[];
};

export type PvpExtractionResult = {
  valid: boolean;
  battle: PvpBattleInfo | null;
  elapsedMs: number;
};

export type PvpOcrProgress = {
  stage: "loading" | "ready" | "recognizing";
  progress: number;
};

// Transient editor metadata. It is deliberately not part of saved records.
export type PvpUnitImport = Pick<PvpExtractedUnit, "student" | "damage"> & {
  candidateIds: string[];
};

export function parsePvpDamage(text: string): number | null {
  const trimmed = text.trim();

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const damage = Number(trimmed);
  return Number.isSafeInteger(damage) && damage >= 0 ? damage : null;
}

export function parsePvpResult(text: string): PvpBattleInfo["result"]["value"] {
  const normalized = text.replace(/\s/g, "").toLowerCase();

  if (normalized === "win") {
    return "WIN";
  }

  if (normalized === "lose") {
    return "LOSE";
  }

  return null;
}

export function getPvpEnemyNameStatus(
  field: PvpOcrField<string>,
  anonymousIcon = false,
): PvpBattleInfo["enemyNameStatus"] {
  if (anonymousIcon) {
    return "anonymous" as const;
  }

  if (!field.value) {
    return "unknown" as const;
  }

  return "named" as const;
}

export function resolvePvpReportTeam<
  T extends PvpStudentIdentity & Pick<Student, "combatClass">,
>(units: PvpExtractedUnit[], students: T[]) {
  const team: { student?: T; damage?: number; report?: PvpUnitImport }[] =
    Array.from({ length: 6 }, () => ({}));

  let striker = 0;
  let special = 4;

  for (const unit of units) {
    const student = students.find(
      (student) => student.id === unit.student.iconMatch.studentId,
    );

    const candidates = unit.student.iconMatch.candidates.flatMap(
      (candidate) => {
        const match = students.find(
          (student) => student.id === candidate.studentId,
        );

        return match ? [match] : [];
      },
    );

    const recognized = { ...unit.student, value: student?.name ?? null };

    const combatClass =
      unit.combatClass ??
      student?.combatClass ??
      (unit.sourceIndex < 4 ? "Main" : "Support");

    const index = combatClass === "Main" ? striker++ : special++;

    if (index >= (combatClass === "Main" ? 4 : 6) || team[index].report) {
      // Keep unexpected column classifications in a vacant slot
      const vacant = team.findIndex((item) => !item.report);

      if (vacant === -1) {
        continue;
      }

      assign(vacant, true);
    } else {
      assign(index, student != null && student.combatClass !== combatClass);
    }

    function assign(index: number, mismatch: boolean) {
      team[index] = {
        student,
        damage: unit.damage.value ?? undefined,
        report: {
          student: {
            ...recognized,
            uncertain:
              recognized.uncertain ||
              !student ||
              mismatch ||
              unit.combatClass == null,
          },
          damage: unit.damage,
          candidateIds: candidates.slice(0, 3).map((candidate) => candidate.id),
        },
      };
    }
  }

  return team;
}

export function correctPvpImportedItem<T extends { report?: PvpUnitImport }>(
  item: T,
  changes: Partial<T>,
) {
  const report = item.report && {
    ...item.report,
    student: { ...item.report.student },
    damage: { ...item.report.damage },
  };

  if (report) {
    if ("student" in changes) {
      report.student.uncertain = false;
    }

    if ("damage" in changes) {
      report.damage.uncertain = false;
    }
  }

  return { ...item, ...changes, report };
}
