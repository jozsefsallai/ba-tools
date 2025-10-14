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
    <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between border rounded-md py-4 px-8 hover:bg-accent">
      <div className="flex-1 flex items-center gap-4 md:gap-6">
        <div>
          {studentRep && (
            <StudentCard student={studentRep} level={roster.accountLevel} />
          )}

          {!studentRep && <EmptyCard />}
        </div>

        <div className="flex-1 flex flex-col gap-2">
          <div className="md:text-2xl font-bold">
            {roster.name ?? "Unnamed"}
          </div>

          <div className="text-lg">
            {GAME_SERVER_NAMES[roster.gameServer]} /{" "}
            <strong>{roster.friendCode}</strong>
          </div>

          <div className="text-sm text-muted-foreground">
            <strong>Students in roster:</strong> {roster.students.length}
          </div>
        </div>

        <div className="text-lg text-muted-foreground">
          {roster.visibility === "public" && <GlobeIcon />}
          {roster.visibility === "private" && <LockIcon />}
        </div>
      </div>
    </div>
  );
}
