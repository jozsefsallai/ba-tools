"use client";

import { EmptyCard } from "@/components/common/empty-card";
import { StudentCard } from "@/components/common/student-card";
import { useStudents } from "@/hooks/use-students";
import { GAME_SERVER_NAMES } from "@/lib/types";
import { GlobeIcon, LockIcon } from "lucide-react";
import { useMemo } from "react";
import type { Doc } from "~convex/dataModel";

export type OwnRostersBrowserItemProps = {
  roster: Doc<"roster">;
};

export function OwnRostersBrowserItem({ roster }: OwnRostersBrowserItemProps) {
  const { students } = useStudents();

  const studentRep = useMemo(() => {
    if (!roster.studentRepId) {
      return null;
    }

    return students.find((s) => s.id === roster.studentRepId) ?? null;
  }, [students, roster.studentRepId]);

  return (
    <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between border rounded-md py-4 px-8 hover:bg-accent max-md:p-4">
      <div className="flex-1 flex items-center gap-4 md:gap-6">
        <div className="max-md:shrink-0 max-md:[zoom:0.75]">
          {studentRep && (
            <StudentCard student={studentRep} level={roster.accountLevel} />
          )}

          {!studentRep && <EmptyCard />}
        </div>

        <div className="flex-1 flex flex-col gap-2 max-md:min-w-0 max-md:gap-1">
          <div className="md:text-2xl font-bold max-md:text-lg max-md:leading-tight">
            {roster.name ?? "Unnamed"}
          </div>

          <div className="text-lg max-md:text-base">
            {GAME_SERVER_NAMES[roster.gameServer]} /{" "}
            <strong>{roster.friendCode}</strong>
          </div>

          <div className="text-sm text-muted-foreground">
            <strong>Students in roster:</strong> {roster.students.length}
          </div>
        </div>

        <div className="text-lg text-muted-foreground max-md:self-start">
          {roster.visibility === "public" && <GlobeIcon />}
          {roster.visibility === "private" && <LockIcon />}
        </div>
      </div>
    </div>
  );
}
