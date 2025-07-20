"use client";

import { StudentCard } from "@/components/common/student-card";
import { Button } from "@/components/ui/button";
import type { Student } from "@prisma/client";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export type OwnTimelineEntryProps = {
  allStudents: Student[];
  entry: FunctionReturnType<typeof api.timeline.getOwn>[number];
};

export function OwnTimelineEntry({
  allStudents,
  entry,
}: OwnTimelineEntryProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const uniqueStudents = useMemo<Student[]>(() => {
    const studentIds = new Set<string>();

    for (const item of entry.items) {
      if (item.type === "student") {
        studentIds.add(item.studentId);
      }
    }

    return allStudents.filter((student) => studentIds.has(student.id));
  }, [allStudents, entry.items]);

  const destroyMutation = useMutation(api.timeline.destroy);

  async function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);

      setTimeout(() => {
        setDeleteConfirm(false);
      }, 5000);

      return;
    }

    await destroyMutation({
      id: entry._id as Id<"timeline">,
    });
  }

  return (
    <article className="border rounded-md py-4 px-8 flex items-center justify-between gap-4">
      <div className="flex flex-col gap-4">
        {entry.name && (
          <div className="text-lg font-semibold">{entry.name}</div>
        )}

        {!entry.name && (
          <div className="text-lg font-semibold text-muted-foreground italic">
            (Untitled Timeline)
          </div>
        )}

        <div className="flex gap-2 items-center">
          {uniqueStudents.map((student) => (
            <div style={{ zoom: 0.75 }} key={student.id}>
              <StudentCard student={student} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" asChild>
          <Link href={`/timeline-visualizer?id=${entry._id}`}>Edit</Link>
        </Button>

        <Button
          variant="destructive"
          onClick={handleDelete}
          className="flex items-center gap-2"
        >
          {deleteConfirm ? "Click again to confirm" : "Delete"}
        </Button>
      </div>
    </article>
  );
}
