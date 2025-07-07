"use client";

import { StudentCard } from "@/components/common/student-card";
import type { Student } from "@prisma/client";

export type TimelineQuickAddProps = {
  students: Student[];
  onStudentClick: (student: Student) => void;
};

export function TimelineQuickAdd({
  students,
  onStudentClick,
}: TimelineQuickAddProps) {
  if (students.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4 border rounded-md py-4 px-8 self-center">
      <h2 className="text-lg font-semibold text-center">Quick Add Student</h2>

      <div className="flex gap-2 items-center justify-center">
        {students.map((student) => (
          <button
            key={student.id}
            type="button"
            className="cursor-pointer"
            onClick={() => onStudentClick(student)}
            style={{ zoom: 0.75 }}
          >
            <StudentCard student={student} />
          </button>
        ))}
      </div>
    </section>
  );
}
