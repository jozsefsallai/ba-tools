"use client";

import type { PVPFormationStudentItem } from "@/app/[locale]/pvp/_lib/types";
import { EmptyCard } from "@/components/common/empty-card";
import { StarLevelInput } from "@/components/common/star-level-input";
import { StudentCard } from "@/components/common/student-card";
import { StudentPicker } from "@/components/common/student-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { Student } from "~prisma";

export type PVPMatchFormationEditorItemProps = {
  id: string;
  triggerId: string;
  item: PVPFormationStudentItem;
  index: number;
  strikerPrefix?: "A" | "D";
  onUpdate(idx: number, item: Partial<PVPFormationStudentItem>): void;
  showDamage?: boolean;
  students: Student[];
};

export function PVPMatchFormationEditorItem({
  id,
  triggerId,
  item,
  index,
  strikerPrefix,
  onUpdate,
  showDamage = true,
  students,
}: PVPMatchFormationEditorItemProps) {
  const t = useTranslations();

  const [open, setOpen] = useState(false);
  const [levelStr, setLevelStr] = useState(item.level?.toString() ?? "");
  const [damageStr, setDamageStr] = useState(item.damage?.toString() ?? "");

  const levelInput = useRef<HTMLInputElement>(null);
  const replacingStudent = useRef(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    animateLayoutChanges: () => false,
  });

  const slot =
    index < 4 ? `${strikerPrefix ?? "F"}${index + 1}` : `S${index + 1}`;

  useEffect(() => setLevelStr(item.level?.toString() ?? ""), [item.level]);
  useEffect(() => setDamageStr(item.damage?.toString() ?? ""), [item.damage]);

  function focusIcon() {
    requestAnimationFrame(() => document.getElementById(triggerId)?.focus());
  }

  const icon = (
    <Button
      id={triggerId}
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      type="button"
      variant="ghost"
      className="h-auto touch-none cursor-grab rounded-lg p-0 active:cursor-grabbing [&_img]:pointer-events-none [&_img]:select-none"
      aria-label={
        item.student
          ? t("tools.pvp.formationEditorItem.editStudent", {
              name: item.student.name,
              slot,
            })
          : t("tools.pvp.formationEditorItem.selectSlot", { slot })
      }
    >
      {item.student ? (
        <StudentCard
          student={item.student}
          level={item.level}
          starLevel={item.starLevel}
          ueLevel={item.ueLevel}
        />
      ) : (
        <EmptyCard className="w-[95px]" />
      )}
    </Button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative flex w-[88px] shrink-0 flex-col items-center gap-1 rounded-xl p-1",
        isDragging && "opacity-45",
      )}
    >
      <div className="relative h-[73px] w-[78px]">
        <div style={{ zoom: 0.82 }}>
          {item.student ? (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>{icon}</PopoverTrigger>
              <PopoverContent
                className="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 overflow-y-auto"
                style={{
                  maxHeight:
                    "calc(var(--radix-popover-content-available-height) - 1rem)",
                }}
                onOpenAutoFocus={(event) => {
                  event.preventDefault();
                  levelInput.current?.focus();
                }}
              >
                <div className="font-semibold text-base">
                  {item.student.name}
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor={`${triggerId}-level`}>
                    {t("tools.pvp.formationEditorItem.level")}
                  </Label>
                  <Input
                    ref={levelInput}
                    id={`${triggerId}-level`}
                    type="number"
                    min={1}
                    max={90}
                    value={levelStr}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setLevelStr(value);

                      if (value === "") {
                        onUpdate(index, { level: undefined });
                      } else if (!Number.isNaN(Number.parseInt(value, 10))) {
                        onUpdate(index, { level: Number.parseInt(value, 10) });
                      }
                    }}
                  />
                </div>
                <fieldset className="flex min-w-0 flex-col gap-1">
                  <legend className="mb-1 text-sm font-medium">
                    {t("tools.pvp.formationEditorItem.starLevel")}
                  </legend>

                  <StarLevelInput
                    value={{ starLevel: item.starLevel, ueLevel: item.ueLevel }}
                    onValueChanged={(value) =>
                      onUpdate(index, {
                        starLevel: value.starLevel,
                        ueLevel: value.ueLevel,
                      })
                    }
                  />
                </fieldset>

                <StudentPicker
                  students={students}
                  onStudentSelected={(student) => {
                    replacingStudent.current = true;
                    onUpdate(index, { student });
                    setOpen(false);
                  }}
                  onCloseAutoFocus={(event) => {
                    if (replacingStudent.current) {
                      event.preventDefault();
                      focusIcon();
                      replacingStudent.current = false;
                    }
                  }}
                >
                  <Button type="button" variant="outline">
                    {t("tools.pvp.formationEditorItem.replaceStudent")}
                  </Button>
                </StudentPicker>
              </PopoverContent>
            </Popover>
          ) : (
            <StudentPicker
              students={students}
              onStudentSelected={(student) => onUpdate(index, { student })}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                focusIcon();
              }}
            >
              {icon}
            </StudentPicker>
          )}
        </div>
        {item.student && (
          <Button
            type="button"
            variant="secondary"
            size="icon-xs"
            className="absolute -right-2 -top-2 rounded-full border-2 border-background opacity-0 shadow-md group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
            aria-label={t("tools.pvp.formationEditorItem.removeStudent", {
              name: item.student.name,
            })}
            onClick={() => {
              onUpdate(index, {
                student: undefined,
                level: undefined,
                starLevel: undefined,
                ueLevel: undefined,
                damage: undefined,
                report: undefined,
                counter: undefined,
              });
              focusIcon();
            }}
          >
            <XIcon />
          </Button>
        )}
      </div>

      <div
        className={cn(
          "flex items-center rounded-md px-2 py-1 text-xs font-bold leading-none text-white",
          index < 4 ? "bg-type-red" : "bg-type-blue",
        )}
      >
        {slot}
      </div>

      {showDamage && (
        <div className="mt-2 flex w-full flex-col gap-1">
          <div className="h-4">
            <Label
              htmlFor={`${triggerId}-damage`}
              className={cn(
                "text-xs text-muted-foreground",
                index !== 0 && index !== 4 && "sr-only",
              )}
            >
              {t("tools.pvp.formationEditorItem.damage")}
            </Label>
          </div>

          <Input
            id={`${triggerId}-damage`}
            type="number"
            min={0}
            value={item.student ? damageStr : ""}
            disabled={!item.student}
            aria-label={
              item.student
                ? t("tools.pvp.formationEditorItem.studentDamage", {
                    name: item.student.name,
                    slot,
                  })
                : t("tools.pvp.formationEditorItem.slotDamage", { slot })
            }
            aria-invalid={item.report?.damage.uncertain || undefined}
            className={cn(
              "h-8 bg-background! bg-linear-to-b px-1 text-xs disabled:opacity-60 md:text-xs",
              index < 4
                ? "border-type-red/40 from-type-red/10 to-type-red/10"
                : "border-type-blue/40 from-type-blue/10 to-type-blue/10",
            )}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setDamageStr(value);

              if (value === "") {
                onUpdate(index, { damage: undefined });
              } else if (!Number.isNaN(Number.parseInt(value, 10))) {
                onUpdate(index, { damage: Number.parseInt(value, 10) });
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
