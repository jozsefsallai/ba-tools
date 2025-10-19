"use client";

import { StudentCard } from "@/components/common/student-card";
import { cn } from "@/lib/utils";
import type { Student } from "@prisma/client";
import { useMemo } from "react";

export type TimelineItemTargetPickerProps = {
  student: Student;
  uniqueStudents: Student[];
  currentTarget?: Student;
  onToggle: (student: Student) => void;
};

export function TimelineItemTargetPicker({
  student,
  uniqueStudents,
  currentTarget,
  onToggle,
}: TimelineItemTargetPickerProps) {
  const filteredStudents = useMemo(() => {
    return uniqueStudents.filter((s) => s.id !== student.id);
  }, [student, uniqueStudents]);

  return (
    <div className="px-1 flex gap-1">
      {filteredStudents.map((student) => (
        <button
          key={student.id}
          type="button"
          className={cn("cursor-pointer", {
            "opacity-50": !!currentTarget && currentTarget.id !== student.id,
          })}
          style={{ zoom: 0.4 }}
          onClick={() => onToggle(student)}
        >
          <StudentCard student={student} busy={false} />
        </button>
      ))}
    </div>
  );
}
