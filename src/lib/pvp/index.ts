import type { PvpIconMatch } from "@/lib/pvp/icon-match";
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

export function parsePvpOpponentName(text: string): string | null {
  // Remove only the first level label; later labels can belong to the username.
  const level = /Lv\s*[.．]?\s*\p{Nd}+/iu.exec(text);
  if (!level) {
    return null;
  }

  const name = text.slice(level.index + level[0].length).trim();
  return name || null;
}

export function selectPvpOpponentReading(fields: PvpOcrField<string>[]) {
  const readings = fields.flatMap((field) => field.alternatives ?? []);

  const recognizedReadings = readings.map((reading) => ({
    ...reading,
    value: parsePvpOpponentName(reading.rawText),
  }));

  const readingsForName = (
    text: string | null,
    confidence = PVP_OCR_CONFIDENCE_THRESHOLD,
  ) => {
    return recognizedReadings.filter(
      (reading) => reading.value === text && reading.confidence >= confidence,
    );
  };

  const support = (text: string) => {
    return new Set(readingsForName(text).map((reading) => reading.language))
      .size;
  };

  const stability = (text: string) => {
    return new Set(
      readingsForName(text, 45).map(
        (reading) => `${reading.language}:${reading.preprocessing}`,
      ),
    ).size;
  };

  const score = (field: PvpOcrField<string>) => {
    return (
      field.confidence +
      Math.min(3, support(field.value ?? "")) * 2 +
      Math.min(2, Math.max(0, stability(field.value ?? "") - 1)) * 8
    );
  };

  const sorted = fields
    .filter((field) => field.value != null)
    .sort((a, b) => score(b) - score(a));

  const best = sorted[0] ?? fields[0];

  const conflicting = sorted.find((field) => field.value !== best.value);

  const consistent = readingsForName(best.value).length >= 2;

  return {
    ...best,
    alternatives: readings,
    uncertain:
      best.uncertain ||
      !consistent ||
      (conflicting != null && conflicting.confidence >= best.confidence - 8),
  };
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
