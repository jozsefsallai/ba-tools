import type {
  SeparatorItem,
  StudentItem,
  TextItem,
  TimelineItem,
} from "@/app/timeline-visualizer/_components/timeline-preview";
import { getShorthand } from "@/lib/student-utils";
import { commandScore } from "@/lib/text-score";
import type { Student } from "~prisma";

type ParsedTimelineItem =
  | Omit<StudentItem, "id">
  | Omit<SeparatorItem, "id">
  | Omit<TextItem, "id">;

type ParseTimelineResult = {
  items: ParsedTimelineItem[];
  unresolved: string[];
};

function buildShorthandIndex(students: Student[]): Map<string, Student> {
  const index = new Map<string, Student>();

  for (const student of students) {
    const shorthand = getShorthand(student).trim().toLowerCase();
    if (!shorthand || index.has(shorthand)) {
      continue;
    }

    index.set(shorthand, student);
  }

  return index;
}

function resolveStudent(
  shorthandIndex: Map<string, Student>,
  students: Student[],
  raw: string,
): Student | null {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const exactMatch = shorthandIndex.get(normalized);
  if (exactMatch) {
    return exactMatch;
  }

  const normalizedInput = normalized.replaceAll(".", "");
  const scores = new Map<string, number>();

  return (
    students
      .filter((student) => {
        const score = commandScore(
          student.name,
          normalizedInput,
          student.searchTags ?? [],
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
      })[0] ?? null
  );
}

type StudentTokenData =
  | {
      student: Student;
      target?: Student;
    }
  | undefined;

function parseStudentToken(
  token: string,
  shorthandIndex: Map<string, Student>,
  students: Student[],
): StudentTokenData {
  if (token.startsWith("(") && token.endsWith(")")) {
    const inner = token.slice(1, -1).trim();
    if (/^c$/i.test(inner)) {
      return undefined;
    }

    const targetMatch = inner.match(/^(.+?)\s*(?:→|->)\s*(.+)$/);
    if (!targetMatch) {
      return undefined;
    }

    const sourceStudent = resolveStudent(
      shorthandIndex,
      students,
      targetMatch[1],
    );
    const targetStudent = resolveStudent(
      shorthandIndex,
      students,
      targetMatch[2],
    );
    if (!sourceStudent || !targetStudent) {
      return undefined;
    }

    return { student: sourceStudent, target: targetStudent };
  }

  if (token.startsWith("[") && token.endsWith("]")) {
    return undefined;
  }

  const student = resolveStudent(shorthandIndex, students, token);
  if (!student) {
    return undefined;
  }

  return { student };
}

function emitVerticalSeparators(items: ParsedTimelineItem[], count: number) {
  for (let i = 0; i < count; i += 1) {
    items.push({
      type: "separator",
      orientation: "vertical",
    });
  }
}

/**
 * Serialize timeline items into the text timeline format used by the visualizer.
 *
 * Notes:
 * - Horizontal separators are omitted in text output.
 * - Text format cannot preserve separator size overrides or student variant IDs.
 */
export function serializeTimelineToText(items: TimelineItem[]): string {
  let output = "";

  for (const item of items) {
    if (item.type === "separator" && item.orientation === "horizontal") {
      continue;
    }

    if (item.type === "separator" && item.orientation === "vertical") {
      output += "\n";
      continue;
    }

    if (item.type === "text") {
      output += `{${item.text.split("\n").join(" ")}} `;
      continue;
    }

    if (item.type === "student") {
      const shorthand = getShorthand(item.student);

      let ex = "";

      if (item.trigger) {
        if (item.trigger.includes(" ")) {
          ex += `\n[${item.trigger}] `;
        } else {
          ex += `\n${item.trigger} `;
        }
      }

      if (item.target) {
        const targetShorthand = getShorthand(item.target);
        ex += `(${shorthand} → ${targetShorthand}) `;
      } else {
        ex += `${shorthand} `;
      }

      if (item.notes) {
        ex += `[${item.notes.split("\n").join(" ")}] `;
      }

      if (item.copy) {
        ex += "(C) ";
      }

      output += ex;
    }
  }

  return output.trim();
}

export function parseTimelineFromText(
  raw: string,
  students: Student[],
): ParseTimelineResult {
  const shorthandIndex = buildShorthandIndex(students);
  const unresolved: string[] = [];
  const items: ParsedTimelineItem[] = [];

  const tokens =
    raw.match(/\n|\{[^}]*}|\[[^\]]*]|\([^)]*\)|[^\s\[\]\(\)\{\}]+/g) ?? [];

  let i = 0;
  let pendingNewlines = 0;
  let atLineStart = true;
  let activeStudentIndex: number | null = null;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token === "\n") {
      pendingNewlines += 1;
      atLineStart = true;
      activeStudentIndex = null;
      i += 1;
      continue;
    }

    const nextToken = tokens[i + 1];
    const isBracketToken = token.startsWith("[") && token.endsWith("]");
    const isBareToken = !token.startsWith("[") && !token.startsWith("(");
    const canBeTrigger = isBracketToken || isBareToken;
    const currentStudentToken = parseStudentToken(
      token,
      shorthandIndex,
      students,
    );
    const nextStudentToken = nextToken
      ? parseStudentToken(nextToken, shorthandIndex, students)
      : undefined;

    if (
      atLineStart &&
      canBeTrigger &&
      nextStudentToken &&
      !currentStudentToken
    ) {
      const trigger = isBracketToken ? token.slice(1, -1).trim() : token.trim();

      const newlinesForSeparators =
        pendingNewlines > 0 ? pendingNewlines - 1 : pendingNewlines;
      emitVerticalSeparators(items, newlinesForSeparators);
      pendingNewlines = 0;

      items.push({
        type: "student",
        student: nextStudentToken.student,
        target: nextStudentToken.target,
        trigger,
      });

      activeStudentIndex = items.length - 1;
      atLineStart = false;
      i += 2;
      continue;
    }

    if (pendingNewlines > 0) {
      emitVerticalSeparators(items, pendingNewlines);
      pendingNewlines = 0;
      activeStudentIndex = null;
    }

    if (token.startsWith("{") && token.endsWith("}")) {
      const textContent = token.slice(1, -1).trim();
      items.push({
        type: "text",
        text: textContent,
      });
      activeStudentIndex = null;
      atLineStart = false;
      i += 1;
      continue;
    }

    if (token.startsWith("[") && token.endsWith("]")) {
      const content = token.slice(1, -1).trim();
      const activeItem =
        activeStudentIndex !== null ? items[activeStudentIndex] : null;
      if (activeItem?.type === "student") {
        const updatedStudent: Omit<StudentItem, "id"> = {
          ...activeItem,
          notes: content,
        };
        items[activeStudentIndex as number] = updatedStudent;
      } else {
        items.push({
          type: "text",
          text: content,
        });
        activeStudentIndex = null;
      }

      atLineStart = false;
      i += 1;
      continue;
    }

    if (token.startsWith("(") && token.endsWith(")")) {
      const content = token.slice(1, -1).trim();

      if (/^c$/i.test(content)) {
        const activeItem =
          activeStudentIndex !== null ? items[activeStudentIndex] : null;
        if (activeItem?.type === "student") {
          const updatedStudent: Omit<StudentItem, "id"> = {
            ...activeItem,
            copy: true,
          };
          items[activeStudentIndex as number] = updatedStudent;
        }
        atLineStart = false;
        i += 1;
        continue;
      }

      const targetMatch = content.match(/^(.+?)\s*(?:→|->)\s*(.+)$/);
      if (!targetMatch) {
        unresolved.push(token);
        activeStudentIndex = null;
        atLineStart = false;
        i += 1;
        continue;
      }

      const sourceStudent = resolveStudent(
        shorthandIndex,
        students,
        targetMatch[1],
      );
      const targetStudent = resolveStudent(
        shorthandIndex,
        students,
        targetMatch[2],
      );
      if (!sourceStudent || !targetStudent) {
        unresolved.push(content);
        activeStudentIndex = null;
        atLineStart = false;
        i += 1;
        continue;
      }

      items.push({
        type: "student",
        student: sourceStudent,
        target: targetStudent,
      });
      activeStudentIndex = items.length - 1;
      atLineStart = false;
      i += 1;
      continue;
    }

    const studentData = parseStudentToken(token, shorthandIndex, students);
    if (!studentData) {
      unresolved.push(token);
      activeStudentIndex = null;
      atLineStart = false;
      i += 1;
      continue;
    }

    items.push({
      type: "student",
      student: studentData.student,
      target: studentData.target,
    });
    activeStudentIndex = items.length - 1;
    atLineStart = false;
    i += 1;
  }

  if (pendingNewlines > 0) {
    emitVerticalSeparators(items, pendingNewlines);
  }

  return {
    items,
    unresolved,
  };
}
