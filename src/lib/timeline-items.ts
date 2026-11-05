import { v4 as uuid } from "uuid";
import type { TimelineItem } from "@/app/[locale]/timeline-visualizer/_components/timeline-preview";
import type { TimelineStorageData } from "@/lib/storage/timeline";
import { isHighlightColor } from "@/lib/timeline-highlight";
import type { Student } from "~prisma";

export function serializeTimelineItems(
  items: TimelineItem[],
): TimelineStorageData["items"] {
  return items.map((item) => {
    if (item.type === "student") {
      return {
        type: "student",
        studentId: item.student.id,
        trigger: item.trigger,
        targetId: item.target?.id,
        extraTargetIds: (item.extraTargets ?? [])
          .map((target) => target?.id)
          .filter((id): id is string => !!id),
        copy: item.copy,
        variantId: item.variantId,
        notes: item.notes,
        highlightColor: item.highlightColor,
      };
    }

    if (item.type === "separator") {
      return {
        type: "separator",
        orientation: item.orientation,
        size: item.size,
      };
    }

    return {
      type: "text",
      text: item.text,
    };
  });
}

export function deserializeTimelineItems(
  items: TimelineStorageData["items"],
  allStudents: Student[],
): TimelineItem[] {
  const output: TimelineItem[] = [];

  for (const item of items) {
    if (item.type !== "student") {
      output.push({
        ...item,
        id: uuid(),
      });
      continue;
    }

    const student = allStudents.find((s) => s.id === item.studentId);
    if (!student) {
      continue;
    }

    output.push({
      type: "student",
      id: uuid(),
      student,
      target: item.targetId
        ? allStudents.find((s) => s.id === item.targetId)
        : undefined,
      extraTargets: (item.extraTargetIds ?? []).map((id) =>
        allStudents.find((s) => s.id === id),
      ),
      copy: item.copy,
      trigger: item.trigger,
      variantId: item.variantId,
      notes: item.notes,
      highlightColor: isHighlightColor(item.highlightColor)
        ? item.highlightColor
        : undefined,
    });
  }

  return output;
}
