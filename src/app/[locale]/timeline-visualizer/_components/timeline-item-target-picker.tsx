"use client";

import { useMemo } from "react";
import { buildStudentIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { Student } from "~prisma";

export type TimelineItemTargetPickerProps = {
  uniqueStudents: Student[];
  selectedIds: string[];
  onToggle: (student: Student) => void;
};

export function StudentTile({
  student,
  className,
}: {
  student: Student;
  className?: string;
}) {
  const image = useMemo(() => {
    return buildStudentIconUrl(student);
  }, [
    student,
  ]);

  return (
    <div
      className={cn(
        "size-8 shrink-0 overflow-hidden rounded-sm border border-black skew-x-[-11deg] dark:border-white",
        {
          "bg-type-red": student.attackType === "Explosion",
          "bg-type-yellow": student.attackType === "Pierce",
          "bg-type-blue": student.attackType === "Mystic",
          "bg-type-purple": student.attackType === "Sonic",
          "bg-type-green": student.attackType === "Chemical",
        },
        className,
      )}
    >
      <img
        src={image}
        alt=""
        className="h-full w-full object-cover skew-x-[11deg]"
      />
    </div>
  );
}

export function TimelineItemTargetPicker({
  uniqueStudents,
  selectedIds,
  onToggle,
}: TimelineItemTargetPickerProps) {
  return (
    <div
      className="flex min-w-0 gap-1 overflow-x-auto p-1 [scrollbar-width:none]"
      onWheel={(event) => {
        event.currentTarget.scrollLeft += event.deltaY;
      }}
    >
      {uniqueStudents.map((student) => {
        const isSelected = selectedIds.includes(student.id);

        return (
          <button
            key={student.id}
            type="button"
            title={student.name}
            aria-label={student.name}
            aria-pressed={isSelected}
            className={cn(
              "shrink-0 cursor-pointer rounded-sm outline-offset-1 transition-opacity",
              isSelected
                ? "outline-2 outline-primary"
                : "opacity-50 hover:opacity-100 focus-visible:opacity-100",
            )}
            onClick={() => onToggle(student)}
          >
            <StudentTile student={student} className="size-7" />
          </button>
        );
      })}
    </div>
  );
}
