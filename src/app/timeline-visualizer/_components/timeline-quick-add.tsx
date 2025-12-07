"use client";

import { buildStudentIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { Student } from "~prisma";
import { useCallback, useMemo } from "react";

export type TimelineQuickAddProps = {
  students: Student[];
  onStudentClick: (student: Student) => void;
  small?: boolean;
};

function StudentItem({
  student,
  small,
}: {
  student: Student;
  small?: boolean;
}) {
  const image = useMemo(() => {
    return buildStudentIconUrl(student);
  }, [student]);

  return (
    <div
      className={cn(
        "border border-black dark:border-white overflow-hidden skew-x-[-11deg]",
        {
          "w-14 h-14 rounded-md": !small,
          "w-6 h-6 rounded-xs": small,
          "bg-type-red": student.attackType === "Explosion",
          "bg-type-yellow": student.attackType === "Pierce",
          "bg-type-blue": student.attackType === "Mystic",
          "bg-type-purple": student.attackType === "Sonic",
        },
      )}
    >
      <img
        src={image}
        alt={student.name}
        className="w-full h-full object-cover skew-x-[11deg]"
      />
    </div>
  );
}

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
      className={cn("flex flex-col gap-4 rounded-md py-4 px-8 self-center", {
        "p-0": small,
      })}
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
          >
            <StudentItem student={student} small={small} />
          </button>
        ))}
      </div>
    </section>
  );
}
