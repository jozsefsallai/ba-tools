"use client";

import { buildStudentIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { Student } from "@prisma/client";
import { useMemo } from "react";

export type TimelineItemTargetPickerProps = {
  student: Student;
  uniqueStudents: Student[];
  currentTarget?: Student;
  onToggle: (student: Student) => void;
};

function StudentItem({
  student,
}: {
  student: Student;
}) {
  const image = useMemo(() => {
    return buildStudentIconUrl(student);
  }, [student]);

  return (
    <div className="w-8 h-8">
      <img
        src={image}
        alt={student.name}
        className="w-full h-full object-cover rounded-md"
      />
    </div>
  );
}

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
            "opacity-40": !!currentTarget && currentTarget.id !== student.id,
          })}
          onClick={() => onToggle(student)}
        >
          <StudentItem student={student} />
        </button>
      ))}
    </div>
  );
}
