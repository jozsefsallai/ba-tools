"use client";

import { StudentCard } from "@/components/common/student-card";
import { Button } from "@/components/ui/button";
import { useStudents } from "@/hooks/use-students";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Student } from "~prisma";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { GlobeIcon, GripVerticalIcon, LockIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export type OwnTimelineEntryProps = {
  entry: FunctionReturnType<typeof api.timeline.getOwn>[number];
  isGroupItem?: boolean;
  onWantsToDeleteFromGroup?: (id: Id<"timeline">) => any;
};

export function OwnTimelineEntry({
  entry,
  isGroupItem,
  onWantsToDeleteFromGroup,
}: OwnTimelineEntryProps) {
  const { students: allStudents } = useStudents();

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: entry._id, animateLayoutChanges: () => false });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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

  function handleDeleteFromGroup() {
    onWantsToDeleteFromGroup?.(entry._id);
  }

  return (
    <article
      ref={setNodeRef}
      className="border bg-background rounded-md py-4 px-8 flex items-center justify-between gap-4"
      style={style}
      id={entry._id}
      {...attributes}
    >
      <div className="flex items-center gap-4">
        {isGroupItem && (
          <Button className="cursor-move" variant="ghost" {...listeners}>
            <GripVerticalIcon />
          </Button>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            {entry.name && (
              <div className="text-lg font-semibold">{entry.name}</div>
            )}

            {!entry.name && (
              <div className="text-lg font-semibold text-muted-foreground italic">
                (Untitled Timeline)
              </div>
            )}

            {entry.visibility === "public" && (
              <GlobeIcon className="size-4 text-muted-foreground" />
            )}
            {entry.visibility === "private" && (
              <LockIcon className="size-4 text-muted-foreground" />
            )}
          </div>

          <div className="flex gap-1 items-center">
            {uniqueStudents.map((student) => (
              <div style={{ zoom: 0.55 }} key={student.id}>
                <StudentCard student={student} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {entry.visibility === "public" && (
          <Button variant="outline" asChild>
            <Link href={`/timelines/${entry._id}`}>View Public Timeline</Link>
          </Button>
        )}

        <Button variant="outline" asChild>
          <Link href={`/timeline-visualizer?id=${entry._id}`}>Edit</Link>
        </Button>

        {isGroupItem && (
          <Button variant="outline" onClick={handleDeleteFromGroup}>
            Remove from Group
          </Button>
        )}

        <Button
          variant="destructive"
          onClick={handleDelete}
          className="flex items-center gap-2"
        >
          {deleteConfirm ? "Click again to confirm" : "Delete Timeline"}
        </Button>
      </div>
    </article>
  );
}
