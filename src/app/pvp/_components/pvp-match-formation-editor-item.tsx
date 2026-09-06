"use client";

import type { PVPFormationStudentItem } from "@/app/pvp/_lib/types";
import { EmptyCard } from "@/components/common/empty-card";
import {
  StarLevelInput,
  type StarLevelInputValue,
} from "@/components/common/star-level-input";
import { StudentCard } from "@/components/common/student-card";
import { StudentPicker } from "@/components/common/student-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import type { Student } from "~prisma";

export type PVPMatchFormationEditorItemProps = {
  item: PVPFormationStudentItem;
  index: number;
  strikerPrefix?: "A" | "D";
  onUpdate(idx: number, item: Partial<PVPFormationStudentItem>): any;
  onMoveUp?(idx: number): void;
  onMoveDown?(idx: number): void;
  advanced?: boolean;
  showDamage?: boolean;
  compactAdvanced?: boolean;
  studentTabIndex?: number;
  propertyTabIndexStart?: number;
  students: Student[];
};

export function PVPMatchFormationEditorItem({
  item,
  index,
  strikerPrefix,
  onUpdate,
  onMoveUp,
  onMoveDown,
  advanced = false,
  showDamage = true,
  compactAdvanced = false,
  studentTabIndex,
  propertyTabIndexStart,
  students,
}: PVPMatchFormationEditorItemProps) {
  const t = useTranslations();
  const [levelStr, setLevelStr] = useState(item.level?.toString() ?? "");
  const [damageStr, setDamageStr] = useState(item.damage?.toString() ?? "");
  const levelTabIndex = advanced ? propertyTabIndexStart : undefined;
  const starTabIndex =
    advanced && propertyTabIndexStart !== undefined
      ? propertyTabIndexStart + 1
      : undefined;
  const damageTabIndex =
    showDamage && propertyTabIndexStart !== undefined
      ? propertyTabIndexStart + (advanced ? 10 : 0)
      : undefined;

  // Preset/report hydration updates the controlled values in the parent.
  // Keep the text inputs visually in sync without losing in-progress edits.
  useEffect(() => setLevelStr(item.level?.toString() ?? ""), [item.level]);
  useEffect(() => setDamageStr(item.damage?.toString() ?? ""), [item.damage]);

  const handleStudentUpdate = useCallback(
    (student: Student) => {
      onUpdate(index, { student });
    },
    [onUpdate, index],
  );

  const handleStudentClear = useCallback(() => {
    onUpdate(index, { student: undefined });
  }, [onUpdate, index]);

  const handleLevelUpdate = useCallback(
    (e: FormEvent<HTMLInputElement>) => {
      const level = e.currentTarget.value;

      setLevelStr(level);

      if (level === "") {
        onUpdate(index, { level: undefined });
        return;
      }

      const numberValue = Number.parseInt(level, 10);
      if (!Number.isNaN(numberValue)) {
        onUpdate(index, { level: numberValue });
      }
    },
    [onUpdate, index],
  );

  const handleStarsUpdate = useCallback(
    (value: StarLevelInputValue) => {
      onUpdate(index, {
        starLevel: value.starLevel,
        ueLevel: value.ueLevel,
      });
    },
    [onUpdate, index],
  );

  const handleDamageUpdate = useCallback(
    (e: FormEvent<HTMLInputElement>) => {
      const damage = e.currentTarget.value;

      setDamageStr(damage);

      if (damage === "") {
        onUpdate(index, { damage: undefined });
        return;
      }

      const numberValue = Number.parseInt(damage, 10);
      if (!Number.isNaN(numberValue)) {
        onUpdate(index, { damage: numberValue });
      }
    },
    [onUpdate, index],
  );

  const handleMoveUp = useCallback(() => {
    onMoveUp?.(index);
  }, [onMoveUp, index]);

  const handleMoveDown = useCallback(() => {
    onMoveDown?.(index);
  }, [onMoveDown, index]);

  return (
    <div className="flex gap-6 items-start">
      <div className="shrink-0 relative">
        {item.student && (
          <StudentCard
            student={item.student}
            level={item.level}
            starLevel={item.starLevel}
            ueLevel={item.ueLevel}
          />
        )}

        {!item.student && <EmptyCard />}

        <div
          className={cn(
            "absolute -top-2 -right-3 font-bold py-0.5 px-2 text-sm border-2 border-white rounded-md text-white",
            {
              "bg-type-red": index < 4,
              "bg-type-blue": index >= 4,
            },
          )}
        >
          {index < 4 ? `${strikerPrefix ?? "F"}${index + 1}` : `S${index + 1}`}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <StudentPicker
            students={students}
            onStudentSelected={handleStudentUpdate}
          >
            <Button
              variant="outline"
              className="flex-1 justify-between"
              tabIndex={studentTabIndex}
            >
              {item.student
                ? item.student.name
                : t("tools.pvp.formationEditorItem.selectStudent")}
              <ChevronDownIcon />
            </Button>
          </StudentPicker>

          {index > 0 && index !== 4 && (
            <Button variant="outline" onClick={handleMoveUp}>
              <ChevronUpIcon />
            </Button>
          )}

          {index < 5 && (
            <Button variant="outline" onClick={handleMoveDown}>
              <ChevronDownIcon />
            </Button>
          )}

          {item.student && (
            <Button variant="outline" onClick={handleStudentClear}>
              <XIcon />
            </Button>
          )}
          {advanced && compactAdvanced && (
            <>
              <div className="flex w-20 flex-col gap-1">
                <Label className="text-xs">
                  {t("tools.pvp.formationEditorItem.level")}
                </Label>

                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={levelStr}
                  tabIndex={levelTabIndex}
                  onChange={handleLevelUpdate}
                />
              </div>

              <div className="flex items-end">
                <StarLevelInput
                  value={{ starLevel: item.starLevel, ueLevel: item.ueLevel }}
                  onValueChanged={handleStarsUpdate}
                  imageClassName="size-6"
                  tabIndexStart={starTabIndex}
                />
              </div>
            </>
          )}
        </div>

        {(showDamage || (advanced && !compactAdvanced)) && (
          <div
            className={cn(
              "grid gap-4",
              advanced ? "grid-cols-4" : "grid-cols-1",
            )}
          >
            {advanced && !compactAdvanced && (
              <div className="flex flex-col gap-1">
                <Label className="text-xs">
                  {t("tools.pvp.formationEditorItem.level")}
                </Label>

                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={levelStr}
                  tabIndex={levelTabIndex}
                  onChange={handleLevelUpdate}
                />
              </div>
            )}

            {advanced && !compactAdvanced && (
              <div className="col-span-2 flex flex-col gap-1">
                <Label className="text-xs">
                  {t("tools.pvp.formationEditorItem.starLevel")}
                </Label>

                <StarLevelInput
                  value={{ starLevel: item.starLevel, ueLevel: item.ueLevel }}
                  onValueChanged={handleStarsUpdate}
                  tabIndexStart={starTabIndex}
                />
              </div>
            )}

            {showDamage && (
              <div className="flex flex-col gap-1">
                <Label className="text-xs">
                  {t("tools.pvp.formationEditorItem.damage")}
                </Label>

                <Input
                  type="number"
                  min={0}
                  value={damageStr}
                  tabIndex={damageTabIndex}
                  onChange={handleDamageUpdate}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
