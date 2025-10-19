"use client";

import { StudentCard } from "@/components/common/student-card";
import { cn } from "@/lib/utils";
import type { Student } from "@prisma/client";
import { useCallback } from "react";

export type TimelineQuickAddProps = {
  students: Student[];
  onStudentClick: (student: Student) => void;
  small?: boolean;
};

export function TimelineQuickAdd({
  students,
  onStudentClick,
  small,
}: TimelineQuickAddProps) {
  if (students.length === 0) {
    return null;
  }

  const handleStudentClick = useCallback(
    (student: Student) => {
      onStudentClick(student);
    },
    [onStudentClick],
  );

  return (
    <section
      className={cn(
        "flex flex-col gap-4 border rounded-md py-4 px-8 self-center",
        {
          "p-0": small,
        },
      )}
    >
      {!small && (
        <h2 className="text-lg font-semibold text-center">Quick Add Student</h2>
      )}

      <div className="flex gap-2 items-center justify-center">
        {students.map((student) => (
          <button
            key={student.id}
            type="button"
            className="cursor-pointer"
            onClick={() => handleStudentClick(student)}
            style={{ zoom: small ? 0.3 : 0.75 }}
          >
            <StudentCard student={student} />
          </button>
        ))}
      </div>
    </section>
  );
}
