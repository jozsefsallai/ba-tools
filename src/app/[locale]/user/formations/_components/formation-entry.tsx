"use client";

import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { FormationRowsReadonly } from "@/app/[locale]/formation-display/_components/formation-rows-readonly";
import { Button } from "@/components/ui/button";
import { useStudents } from "@/hooks/use-students";
import { Link } from "@/i18n/navigation";
import { formationDocToRows } from "@/lib/formation-display-utils";
import { api } from "~convex/api";

export type FormationEntryProps = {
  entry: FunctionReturnType<typeof api.formation.getOwn>[number];
};

export function FormationEntry({ entry }: FormationEntryProps) {
  const { students: allStudents } = useStudents();
  const t = useTranslations();

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const destroyMutation = useMutation(api.formation.destroy);

  const previewRows = useMemo(
    () => formationDocToRows(entry, allStudents),
    [
      entry,
      allStudents,
    ],
  );

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
    <article className="border rounded-md py-4 px-8 flex items-center justify-between gap-4 max-md:flex-col max-md:items-stretch max-md:px-4">
      <div className="flex flex-col max-md:min-w-0">
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
          className="max-md:overflow-x-auto"
          style={{
            zoom: 0.8,
          }}
        >
          <FormationRowsReadonly
            className="max-md:max-w-none"
            rows={previewRows}
            type={entry.type}
            rowGap={entry.rowGap}
            displayOverline={entry.displayOverline}
            noDisplayRole={entry.noDisplayRole}
            groupsVertical={entry.groupsVertical}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" asChild>
          <Link href={`/formation-display?id=${entry._id}`}>
            {t("common.edit")}
          </Link>
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
