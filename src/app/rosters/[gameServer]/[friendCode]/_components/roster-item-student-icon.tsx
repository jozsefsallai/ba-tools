"use client";

import { StudentCard } from "@/components/common/student-card";
import type { StarLevel, Student, UELevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSyncExternalStore } from "react";

type RosterItemStudentIconProps = {
  student: Student;
  level: number;
  starLevel: StarLevel;
  ueLevel?: UELevel;
  featured?: boolean;
};

function subscribe(onStoreChange: () => void) {
  const sm = window.matchMedia("(min-width: 640px)");
  sm.addEventListener("change", onStoreChange);
  return () => sm.removeEventListener("change", onStoreChange);
}

function getIsSmOrAbove() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.matchMedia("(min-width: 640px)").matches;
}

function useIsSmOrAbove() {
  return useSyncExternalStore(subscribe, getIsSmOrAbove, () => true);
}

export function RosterItemStudentIcon({
  student,
  level,
  starLevel,
  ueLevel,
  featured = false,
}: RosterItemStudentIconProps) {
  const isSmOrAbove = useIsSmOrAbove();
  const zoom = isSmOrAbove ? (featured ? 0.95 : 0.85) : 1;

  return (
    <div
      className={cn(
        "relative shrink-0 max-sm:h-[70px] max-sm:w-[65px]",
        featured && "max-sm:h-[74px]",
      )}
    >
      <div
        className="origin-top-left max-sm:absolute max-sm:top-0 max-sm:left-0 max-sm:scale-[0.7] sm:static sm:scale-100"
        style={zoom === 1 ? undefined : { zoom }}
      >
        <StudentCard
          student={student}
          level={level}
          starLevel={starLevel}
          ueLevel={ueLevel}
          borrowed={featured}
        />
      </div>
    </div>
  );
}
