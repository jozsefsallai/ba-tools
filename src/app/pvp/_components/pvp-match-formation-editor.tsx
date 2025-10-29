"use client";

import { PVPMatchFormationEditorItem } from "@/app/pvp/_components/pvp-match-formation-editor-item";
import type { PVPFormationStudentItem } from "@/app/pvp/_lib/types";

export type PVPMatchFormationEditorProps = {
  formation: PVPFormationStudentItem[];
  onUpdate(idx: number, item: Partial<PVPFormationStudentItem>): void;
  strikerPrefix?: "A" | "D";
};

export function PVPMatchFormationEditor({
  formation,
  onUpdate,
  strikerPrefix,
}: PVPMatchFormationEditorProps) {
  return (
    <div className="flex flex-col gap-6">
      {formation.map((item, idx) => (
        <PVPMatchFormationEditorItem
          key={idx}
          item={item}
          index={idx}
          strikerPrefix={strikerPrefix}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}
