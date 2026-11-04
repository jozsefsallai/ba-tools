import type { Ref } from "react";
import { FormationPreview } from "@/app/[locale]/formation-display/_components/formation-preview";
import { FormationRowsStack } from "@/app/[locale]/formation-display/_components/formation-row-label";
import type { FormationEditorRow } from "@/lib/formation-display-utils";
import { type FormationType, inferFormationType } from "@/lib/formation-type";

export type FormationRowsReadonlyProps = {
  rows: FormationEditorRow[];
  type?: FormationType;
  rowGap?: number;
  displayOverline?: boolean;
  noDisplayRole?: boolean;
  groupsVertical?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
};

export function FormationRowsReadonly({
  rows,
  type,
  rowGap = 8,
  displayOverline,
  noDisplayRole,
  groupsVertical,
  className,
  ref,
}: FormationRowsReadonlyProps) {
  const effectiveType = type ?? inferFormationType(rows);

  return (
    <FormationRowsStack
      ref={ref}
      className={className}
      rowGap={rowGap}
      items={rows.map((row) => ({
        key: row.id,
        label: row.label,
        children: (
          <FormationPreview
            strikers={row.strikers}
            specials={row.specials}
            tcs={row.tcs}
            displayOverline={displayOverline}
            noDisplayRole={noDisplayRole}
            groupsVertical={groupsVertical}
            formationType={effectiveType}
          />
        ),
      }))}
    />
  );
}
