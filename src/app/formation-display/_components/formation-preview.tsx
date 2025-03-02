"use client";

import { StudentCard } from "@/components/common/student-card";
import type { StarLevel, Student, UELevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { RefObject } from "react";

export type StudentItem = {
  student: Student;
  starter?: boolean;
  starLevel?: StarLevel;
  ueLevel?: UELevel;
  borrowed?: boolean;
  level?: number;
};

export type FormationPreviewProps = {
  containerRef?: RefObject<HTMLDivElement | null>;
  strikers: StudentItem[];
  specials: StudentItem[];
  displayOverline?: boolean;
  noDisplayRole?: boolean;
};

function Overline({
  color,
  hasStarter,
}: { color: string; hasStarter: boolean }) {
  return (
    <div
      className={cn(
        "w-[99%] h-[6px] rounded-t-[10px] skew-x-[-11deg] ml-[12px]",
        {
          "mt-[-1px]": !hasStarter,
        },
      )}
      style={{ backgroundColor: color }}
    />
  );
}

export function FormationPreview({
  containerRef,
  strikers,
  specials,
  displayOverline,
  noDisplayRole,
}: FormationPreviewProps) {
  if (strikers.length === 0 && specials.length === 0) {
    return (
      <div className="border rounded-md px-4 py-10 text-center text-xl text-muted-foreground">
        No students in formation.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 items-center justify-center">
      <div className="flex items-center gap-3 p-4" ref={containerRef}>
        <div className="flex flex-col gap-1">
          {displayOverline && strikers.length > 0 && (
            <Overline
              color="#b63835"
              hasStarter={strikers.some((s) => s.starter)}
            />
          )}

          <div className="flex items-center gap-[2px]">
            {strikers.map((student) => (
              <StudentCard
                key={student.student.id}
                noDisplayRole={noDisplayRole}
                {...student}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {displayOverline && specials.length > 0 && (
            <Overline
              color="#226fbc"
              hasStarter={specials.some((s) => s.starter)}
            />
          )}

          <div className="flex items-center gap-[2px]">
            {specials.map((student) => (
              <StudentCard
                key={student.student.id}
                noDisplayRole={noDisplayRole}
                {...student}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
