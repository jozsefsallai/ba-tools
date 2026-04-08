"use client";

import { FormationPreview } from "@/app/formation-display/_components/formation-preview";
import { Button } from "@/components/ui/button";
import { persistedSlotsToStudentItems } from "@/lib/formation-display-utils";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "~convex/api";
import { useStudents } from "@/hooks/use-students";
import { useTranslations } from "next-intl";

export type FormationEntryProps = {
  entry: FunctionReturnType<typeof api.formation.getOwn>[number];
};

export function FormationEntry({ entry }: FormationEntryProps) {
  const { students: allStudents } = useStudents();
  const t = useTranslations();

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const destroyMutation = useMutation(api.formation.destroy);

  const previewRows = useMemo(() => {
    const sources =
      entry.rows && entry.rows.length > 0
        ? entry.rows
        : [{ strikers: entry.strikers, specials: entry.specials }];

    return sources.map((row) => ({
      strikers: persistedSlotsToStudentItems(row.strikers, allStudents),
      specials: persistedSlotsToStudentItems(row.specials, allStudents),
    }));
  }, [entry.rows, entry.strikers, entry.specials, allStudents]);

  const rowGapPx = entry.rowGap ?? 8;

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
              {t("common.untitledFormation")}
            </div>
          )}
        </div>

        <div
          className="flex w-fit max-w-full flex-col items-center"
          style={{ zoom: 0.8, gap: rowGapPx }}
        >
          {previewRows.map((row, rowIndex) => (
            <FormationPreview
              key={`${entry._id}-row-${rowIndex}`}
              strikers={row.strikers}
              specials={row.specials}
              displayOverline={entry.displayOverline}
              noDisplayRole={entry.noDisplayRole}
              groupsVertical={entry.groupsVertical}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" asChild>
          <Link href={`/formation-display?id=${entry._id}`}>{t("common.edit")}</Link>
        </Button>

        <Button
          variant="destructive"
          onClick={handleDelete}
          className="flex items-center gap-2"
        >
          {deleteConfirm ? t("common.clickAgainToConfirm") : t("common.delete")}
        </Button>
      </div>
    </article>
  );
}
