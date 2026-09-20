"use client";

import { FormationPreview } from "@/app/[locale]/formation-display/_components/formation-preview";
import { FormationRowsStack } from "@/app/[locale]/formation-display/_components/formation-row-label";
import { Button } from "@/components/ui/button";
import { useStudents } from "@/hooks/use-students";
import {
  createDefaultFormationRowLabel,
  persistedSlotsToStudentItems,
} from "@/lib/formation-display-utils";
import { inferFormationType } from "@/lib/formation-type";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { api } from "~convex/api";
import { Link } from "@/i18n/navigation";

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

    return sources.map((row) => {
      const label =
        "label" in row && row.label
          ? createDefaultFormationRowLabel({
              text: row.label.text,
              side: row.label.side,
              fontSize: row.label.fontSize,
              color: row.label.color,
              shadowEnabled: row.label.shadowEnabled,
              shadowColor: row.label.shadowColor,
              shadowOpacity: row.label.shadowOpacity,
              shadowOffsetX: row.label.shadowOffsetX,
              shadowOffsetY: row.label.shadowOffsetY,
              shadowBlur: row.label.shadowBlur,
              shadowSpread: row.label.shadowSpread,
              distance: row.label.distance,
            })
          : undefined;

      return {
        strikers: persistedSlotsToStudentItems(row.strikers, allStudents),
        specials: persistedSlotsToStudentItems(row.specials, allStudents),
        label,
      };
    });
  }, [entry.rows, entry.strikers, entry.specials, allStudents]);

  const rowGapPx = entry.rowGap ?? 8;
  const effectiveType = useMemo(
    () =>
      entry.type ??
      inferFormationType(
        previewRows.map((row) => ({
          strikers: row.strikers,
          specials: row.specials,
        })),
      ),
    [entry.type, previewRows],
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

        <div style={{ zoom: 0.8 }}>
          <FormationRowsStack
            rowGap={rowGapPx}
            items={previewRows.map((row, rowIndex) => ({
              key: `${entry._id}-row-${rowIndex}`,
              label: row.label,
              children: (
                <FormationPreview
                  strikers={row.strikers}
                  specials={row.specials}
                  displayOverline={entry.displayOverline}
                  noDisplayRole={entry.noDisplayRole}
                  groupsVertical={entry.groupsVertical}
                  formationType={effectiveType}
                />
              ),
            }))}
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
