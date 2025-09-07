"use client";

import {
  FormationPreview,
  type StudentItem,
} from "@/app/formation-display/_components/formation-preview";
import { Button } from "@/components/ui/button";
import type { Student } from "@prisma/client";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "~convex/api";
import { v4 as uuid } from "uuid";

export type FormationEntryProps = {
  allStudents: Student[];
  entry: FunctionReturnType<typeof api.formation.getOwn>[number];
};

export function FormationEntry({ allStudents, entry }: FormationEntryProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const destroyMutation = useMutation(api.formation.destroy);

  const strikers = useMemo<StudentItem[]>(() => {
    const output: StudentItem[] = [];

    for (const item of entry.strikers) {
      const student = allStudents.find((s) => s.id === item.studentId);
      if (student) {
        output.push({
          id: uuid(),
          student,
          starter: item.starter,
          starLevel: item.starLevel,
          ueLevel: item.ueLevel,
          borrowed: item.borrowed,
          level: item.level,
        });
      } else {
        output.push({
          id: uuid(),
        });
      }
    }

    return output;
  }, [entry.strikers, allStudents]);

  const specials = useMemo<StudentItem[]>(() => {
    const output: StudentItem[] = [];

    for (const item of entry.specials) {
      const student = allStudents.find((s) => s.id === item.studentId);
      if (student) {
        output.push({
          id: uuid(),
          student,
          starter: item.starter,
          starLevel: item.starLevel,
          ueLevel: item.ueLevel,
          borrowed: item.borrowed,
          level: item.level,
        });
      } else {
        output.push({
          id: uuid(),
        });
      }
    }

    return output;
  }, [entry.specials, allStudents]);

  async function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);

      setTimeout(() => {
        setDeleteConfirm(false);
      }, 5000);

      return;
    }

    await destroyMutation({
      id: entry._id,
    });
  }

  return (
    <article className="border rounded-md py-4 px-8 flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          {entry.name && (
            <div className="text-xl font-semibold">{entry.name}</div>
          )}

          {!entry.name && (
            <div className="text-xl font-semibold text-muted-foreground italic">
              (Untitled Formation)
            </div>
          )}
        </div>

        <div style={{ zoom: 0.8 }}>
          <FormationPreview
            strikers={strikers}
            specials={specials}
            displayOverline={entry.displayOverline}
            noDisplayRole={entry.noDisplayRole}
            groupsVertical={entry.groupsVertical}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" asChild>
          <Link href={`/formation-display?id=${entry._id}`}>Edit</Link>
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
