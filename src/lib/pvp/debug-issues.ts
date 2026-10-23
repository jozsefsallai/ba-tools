import {
  type PvpExtractedUnit,
  type PvpExtractionResult,
  type PvpOcrField,
  type PvpStudentIdentity,
  resolvePvpReportTeam,
} from "@/lib/pvp";
import type { Student } from "@/lib/types";

export type PvpDebugSeverity = "error" | "warning";

export type PvpDebugIssue = {
  severity: PvpDebugSeverity;
  // Element id of the field the issue refers to
  target: string;
  title: string;
  detail?: string;
  // The bulk importer rejects the screenshot outright
  blocking?: boolean;
};

export type PvpDebugFieldStatus = "ok" | "uncertain" | "missing";

export function getPvpDebugFieldStatus(
  field: PvpOcrField<unknown>,
): PvpDebugFieldStatus {
  if (field.value == null) {
    return "missing";
  }

  return field.uncertain ? "uncertain" : "ok";
}

export function getPvpDebugUnitId(
  side: "myUnits" | "enemyUnits",
  unit: Pick<PvpExtractedUnit, "sourceIndex">,
) {
  return `debug-${side}-${unit.sourceIndex}`;
}

type DebugStudent = PvpStudentIdentity & Pick<Student, "combatClass">;

// Explains why the importer marked a recognized student as uncertain
export function getPvpDebugStudentReasons(
  unit: PvpExtractedUnit,
  students: DebugStudent[],
): string[] {
  const match = unit.student.iconMatch;
  const student = students.find((student) => student.id === match.studentId);
  const reasons: string[] = [];

  if (!student) {
    reasons.push(
      match.studentId
        ? `matched ${match.studentId}, which is not in the student list`
        : "no icon match",
    );
  }

  if (match.uncertain) {
    reasons.push(
      `weak icon match (similarity ${match.confidence.toFixed(1)}, separation ${(match.margin * 100).toFixed(1)}%)`,
    );
  }

  if (unit.combatClass == null) {
    reasons.push("bar color not detected, class inferred from column");
  } else if (student && student.combatClass !== unit.combatClass) {
    reasons.push(
      `bar says ${unit.combatClass}, but ${student.name} is ${student.combatClass}`,
    );
  }

  return reasons;
}

const SIDE_LABELS = { myUnits: "My team", enemyUnits: "Enemy team" } as const;

export function collectPvpDebugIssues(
  extraction: PvpExtractionResult,
  students: DebugStudent[],
): PvpDebugIssue[] {
  const issues: PvpDebugIssue[] = [];
  const battle = extraction.battle;

  if (!extraction.valid || !battle) {
    issues.push({
      severity: "error",
      blocking: true,
      target: "debug-regions",
      title: "Unit charts could not be segmented",
      detail:
        "No units were found on one or both sides. The importer rejects this screenshot as an invalid report.",
    });

    return issues;
  }

  const required = [
    ["debug-battle-type", "Battle type", battle.battleType],
    ["debug-result", "Result", battle.result],
  ] as const;

  for (const [target, label, field] of required) {
    const status = getPvpDebugFieldStatus(field);

    if (status === "missing") {
      issues.push({
        severity: "error",
        blocking: true,
        target,
        title: `${label} not detected`,
        detail: `Required field, so the importer will fail this screenshot. Scores: ${field.rawText || "none"}`,
      });
    } else if (status === "uncertain") {
      issues.push({
        severity: "warning",
        target,
        title: `${label} read as ${field.value}, but uncertain`,
        detail: `Scores: ${field.rawText}`,
      });
    }
  }

  if (battle.enemyNameStatus === "unknown") {
    issues.push({
      severity: "warning",
      target: "debug-opponent-name",
      title: "Opponent name not read",
      detail: "The match will be saved without an opponent name.",
    });
  } else if (battle.enemyNameStatus === "named" && battle.enemyName.uncertain) {
    issues.push({
      severity: "warning",
      target: "debug-opponent-name",
      title: `Opponent name "${battle.enemyName.value}" is uncertain`,
    });
  }

  if (battle.enemyNameStatus !== "anonymous") {
    const rep = battle.enemyStudentRep;
    const repStudent = students.find(
      (student) => student.id === rep.iconMatch.studentId,
    );

    if (!repStudent) {
      issues.push({
        severity: "warning",
        target: "debug-opponent-representative",
        title: "Opponent representative not recognized",
        detail: "The match will be saved without a representative.",
      });
    } else if (rep.uncertain) {
      issues.push({
        severity: "warning",
        target: "debug-opponent-representative",
        title: `Opponent representative ${repStudent.name} is uncertain`,
        detail: `Similarity ${rep.iconMatch.confidence.toFixed(1)}, separation ${(rep.iconMatch.margin * 100).toFixed(1)}%`,
      });
    }
  }

  for (const side of ["myUnits", "enemyUnits"] as const) {
    const units = battle[side];
    const team = resolvePvpReportTeam(units, students);
    const placed = team.filter((item) => item.report).length;

    if (placed < units.length) {
      issues.push({
        severity: "error",
        target: `debug-${side}`,
        title: `${SIDE_LABELS[side]}: ${units.length - placed} detected column(s) dropped`,
        detail:
          "More columns were detected than fit in a 4 striker + 2 special team.",
      });
    }

    const seen = new Map<string, number>();

    for (const unit of units) {
      const target = getPvpDebugUnitId(side, unit);
      const column = `${SIDE_LABELS[side]}, column ${unit.sourceIndex + 1}`;
      const reasons = getPvpDebugStudentReasons(unit, students);
      const studentId = unit.student.iconMatch.studentId;
      const student = students.find((student) => student.id === studentId);

      if (!student) {
        issues.push({
          severity: "error",
          target,
          title: `${column}: student not recognized`,
          detail: reasons.join("; "),
        });
      } else if (reasons.length) {
        issues.push({
          severity: "warning",
          target,
          title: `${column}: ${student.name} is uncertain`,
          detail: reasons.join("; "),
        });
      }

      if (studentId) {
        const previous = seen.get(studentId);

        if (previous != null) {
          issues.push({
            severity: "warning",
            target,
            title: `${column}: ${student?.name ?? studentId} also matched column ${previous + 1}`,
            detail: "A team cannot contain the same student twice.",
          });
        } else {
          seen.set(studentId, unit.sourceIndex);
        }
      }

      const damage = getPvpDebugFieldStatus(unit.damage);

      if (damage === "missing") {
        issues.push({
          severity: "error",
          target,
          title: `${column}: damage not read`,
          detail: unit.damage.crop
            ? `OCR read "${unit.damage.rawText}"`
            : "No damage badge found above this column.",
        });
      } else if (damage === "uncertain") {
        issues.push({
          severity: "warning",
          target,
          title: `${column}: damage ${unit.damage.value} is uncertain`,
          detail: `OCR confidence ${unit.damage.confidence.toFixed(1)}`,
        });
      }
    }
  }

  // Stable sort keeps report order within each severity
  return issues.sort(
    (a, b) =>
      Number(a.severity === "warning") - Number(b.severity === "warning"),
  );
}
