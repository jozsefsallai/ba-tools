"use client";

import { PVPFormationEditorStrip } from "@/app/[locale]/pvp/_components/pvp-formation-editor-strip";
import { PVPMatchFormationEditorItem } from "@/app/[locale]/pvp/_components/pvp-match-formation-editor-item";
import type { PVPFormationStudentItem } from "@/app/[locale]/pvp/_lib/types";
import { useStudents } from "@/hooks/use-students";

export type PVPMatchFormationEditorProps = {
  formation: PVPFormationStudentItem[];
  onUpdate(idx: number, item: Partial<PVPFormationStudentItem>): void;
  onMove(from: number, to: number): void;
  strikerPrefix?: "A" | "D";
  showDamage?: boolean;
};

export function PVPMatchFormationEditor({
  formation,
  onUpdate,
  onMove,
  strikerPrefix,
  showDamage = true,
}: PVPMatchFormationEditorProps) {
  const { students } = useStudents();
  return (
    <PVPFormationEditorStrip
      formation={formation}
      onMove={onMove}
      renderItem={(item, index, id, triggerId) => (
        <PVPMatchFormationEditorItem
          id={id}
          triggerId={triggerId}
          item={item}
          index={index}
          strikerPrefix={strikerPrefix}
          onUpdate={onUpdate}
          showDamage={showDamage}
          students={students.filter(
            (student) =>
              student.id === item.student?.id ||
              (student.combatClass === (index < 4 ? "Main" : "Support") &&
                !formation.some(
                  (other, otherIndex) =>
                    otherIndex !== index && other.student?.id === student.id,
                )),
          )}
        />
      )}
    />
  );
}
