"use client";

import { PVPMatchFormationEditorItem } from "@/app/pvp/_components/pvp-match-formation-editor-item";
import type { PVPFormationStudentItem } from "@/app/pvp/_lib/types";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTranslations } from "next-intl";

export type PVPMatchFormationEditorProps = {
  formation: PVPFormationStudentItem[];
  onUpdate(idx: number, item: Partial<PVPFormationStudentItem>): void;
  onMoveUp?(idx: number): void;
  onMoveDown?(idx: number): void;
  strikerPrefix?: "A" | "D";
  advanced?: boolean;
  showDamage?: boolean;
  compactAdvanced?: boolean;
  onAdvancedChange?(advanced: boolean): void;
};

export function PVPMatchFormationEditor({
  formation,
  onUpdate,
  onMoveUp,
  onMoveDown,
  strikerPrefix,
  advanced = false,
  onAdvancedChange,
  showDamage = true,
  compactAdvanced = false,
}: PVPMatchFormationEditorProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Switch
          id={`pvp-advanced-${strikerPrefix ?? "formation"}`}
          checked={advanced}
          onCheckedChange={onAdvancedChange}
        />

        <Label htmlFor={`pvp-advanced-${strikerPrefix ?? "formation"}`}>
          {t("tools.pvp.advancedMode")}
        </Label>
      </div>
      {formation.map((item, idx) => (
        <PVPMatchFormationEditorItem
          key={idx}
          item={item}
          index={idx}
          strikerPrefix={strikerPrefix}
          onUpdate={onUpdate}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          advanced={advanced}
          showDamage={showDamage}
          compactAdvanced={compactAdvanced}
        />
      ))}
    </div>
  );
}
