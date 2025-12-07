import { commandScore } from "@/lib/text-score";
import type { StarLevel, UELevel } from "@/lib/types";
import type { Student } from "~prisma";

export type EchelonStudentItem = {
  student: Student;
  level?: number;
  starLevel?: StarLevel;
  ueLevel?: UELevel;
  starter?: boolean;
  borrowed?: boolean;
};

export type EchelonItem = EchelonStudentItem | null;

export type EchelonData = {
  strikers: EchelonItem[];
  specials: EchelonItem[];
};

function findStudent(students: Student[], input: string): Student | null {
  const scores = new Map<string, number>();

  const normalizedInput = input.toLowerCase().trim().replaceAll(".", "");

  return (
    students
      .filter((student) => {
        const score = commandScore(
          student.name,
          normalizedInput,
          student.searchTags,
        );

        if (score > 0.15) {
          scores.set(student.id, score);
          return true;
        }

        return false;
      })
      .sort((a, b) => {
        const scoreA = scores.get(a.id) ?? 0;
        const scoreB = scores.get(b.id) ?? 0;

        if (scoreA === scoreB) {
          return a.name.localeCompare(b.name);
        }

        return scoreB - scoreA;
      })[0] || null
  );
}

export function parseEchelon(students: Student[], raw: string): EchelonData {
  const data: EchelonData = {
    strikers: [],
    specials: [],
  };

  const [strikerBlock, specialBlock] = raw.split(/\n-{2,}\n/);

  function parseStudentLine(l: string): EchelonItem {
    let line = l.trim();
    if (!l) {
      return null;
    }

    // Name + Flags
    const components = line.split(":");
    const nameAndFlags = components[0].trim();
    line = components.slice(1).join(":").trim();

    // Flags
    let borrowed: boolean | undefined;
    let starter: boolean | undefined;

    const flagMatch = nameAndFlags.match(/\[([AS]+)\]/i);
    let namePart = nameAndFlags;

    if (flagMatch) {
      const flags = flagMatch[1];
      starter = flags.includes("S");
      borrowed = flags.includes("A");

      namePart = nameAndFlags.replace(flagMatch[0], "").trim();
    }

    // Student
    const student = findStudent(students, namePart);
    if (!student) {
      return null;
    }

    const studentItem: EchelonStudentItem = {
      student,
      starter,
      borrowed,
    };

    // Level
    const levelMatch = line.match(/^(?:lv|LV)\s*\.?\s*(\d+)/i);
    if (levelMatch) {
      const level = Number.parseInt(levelMatch[1], 10);

      if (!Number.isNaN(level)) {
        studentItem.level = Math.min(Math.max(level, 1), 90);
      }

      line = line.substring(levelMatch[0].length).trim();
    }

    // Star Level
    const starMatch = line.match(/^(\d)\*/);
    if (starMatch) {
      const starLevel = Number.parseInt(starMatch[1], 10);

      if (!Number.isNaN(starLevel)) {
        studentItem.starLevel = Math.min(
          Math.max(starLevel, 1),
          5,
        ) as StarLevel;
      }

      line = line.substring(starMatch[0].length).trim();
    }

    // UE Level
    const ueMatch = line.match(/^(?:UE|UW|EW)(\d+)/i);
    if (ueMatch) {
      const ueLevel = Number.parseInt(ueMatch[1], 10);

      if (!Number.isNaN(ueLevel)) {
        if (ueLevel <= 30) {
          studentItem.ueLevel = 1;
        } else if (ueLevel <= 40) {
          studentItem.ueLevel = 2;
        } else if (ueLevel <= 50) {
          studentItem.ueLevel = 3;
        } else {
          studentItem.ueLevel = 4;
        }
      }

      line = line.substring(ueMatch[0].length).trim();
    }

    return studentItem;
  }

  for (const line of strikerBlock.split("\n")) {
    const echelonItem = parseStudentLine(line);

    if (echelonItem?.student.combatClass === "Support") {
      data.specials.push(echelonItem);
    } else {
      data.strikers.push(echelonItem);
    }
  }

  if (specialBlock) {
    for (const line of specialBlock.split("\n")) {
      const echelonItem = parseStudentLine(line);

      if (echelonItem?.student.combatClass === "Main") {
        data.strikers.push(echelonItem);
      } else {
        data.specials.push(echelonItem);
      }
    }
  }

  return data;
}
