"use client";

import { PVPFormationEditorStrip } from "@/app/[locale]/pvp/_components/pvp-formation-editor-strip";
import type { PVPFormationStudentItem } from "@/app/[locale]/pvp/_lib/types";
import { EmptyCard } from "@/components/common/empty-card";
import { StudentCard } from "@/components/common/student-card";
import { StudentPicker } from "@/components/common/student-picker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PVP_COUNTER_RANGES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { rectSwappingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import type { Student } from "~prisma";

type PVPDefenseTeamStripProps = {
  formation: PVPFormationStudentItem[];
  students: Student[];
  onUpdate(index: number, item: Partial<PVPFormationStudentItem>): void;
  onMove(from: number, to: number): void;
  searchMode?: boolean;
};

export function PVPDefenseTeamStrip({
  formation,
  students,
  onUpdate,
  onMove,
  searchMode = false,
}: PVPDefenseTeamStripProps) {
  return (
    <PVPFormationEditorStrip
      formation={formation}
      onMove={onMove}
      strategy={rectSwappingStrategy}
      renderItem={(item, index, id, triggerId) => (
        <PVPDefenseTeamStripItem
          id={id}
          triggerId={triggerId}
          item={item}
          index={index}
          onUpdate={onUpdate}
          searchMode={searchMode}
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

type PVPDefenseTeamStripItemProps = {
  id: string;
  triggerId: string;
  item: PVPFormationStudentItem;
  index: number;
  onUpdate: PVPDefenseTeamStripProps["onUpdate"];
  searchMode: boolean;
  students: Student[];
};

function PVPDefenseTeamStripItem({
  id,
  triggerId,
  item,
  index,
  onUpdate,
  searchMode,
  students,
}: PVPDefenseTeamStripItemProps) {
  const t = useTranslations();
  const criterionTrigger = useRef<HTMLButtonElement>(null);
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

  const slot = index < 4 ? `D${index + 1}` : `S${index + 1}`;

  const criterion = searchMode && index < 4 ? item.counter : undefined;
  const criterionValue = !criterion
    ? "student"
    : criterion.kind === "tank"
      ? "tank"
      : `range:${criterion.value}`;

  const criterionLabel =
    criterion &&
    (criterion.kind === "tank"
      ? t("tools.pvp.stats.counterCardTank")
      : t("tools.pvp.stats.counterCardRange", { range: criterion.value }));

  function focusIcon() {
    requestAnimationFrame(() => document.getElementById(triggerId)?.focus());
  }

  const card = (
    <Button
      id={triggerId}
      ref={setActivatorNodeRef}
      type="button"
      variant="ghost"
      className="h-auto touch-none cursor-grab rounded-lg p-0 active:cursor-grabbing [&_img]:pointer-events-none [&_img]:select-none"
      {...attributes}
      {...listeners}
      aria-label={t("tools.pvp.stats.selectDefenseSlot", { slot })}
      onClick={criterion ? () => criterionTrigger.current?.click() : undefined}
    >
      {criterion ? (
        <EmptyCard
          className="w-[95px] border-primary/60 bg-primary/20 opacity-80"
          label={criterionLabel || undefined}
        />
      ) : item.student ? (
        <StudentCard student={item.student} />
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
      {searchMode && index < 4 && (
        <Select
          value={criterionValue}
          onValueChange={(value) => {
            if (value === "student") {
              onUpdate(index, { counter: undefined });
            } else if (value === "tank") {
              onUpdate(index, {
                student: undefined,
                counter: { kind: "tank" },
              });
            } else {
              onUpdate(index, {
                student: undefined,
                counter: {
                  kind: "range",
                  value: Number(
                    value.slice(6),
                  ) as (typeof PVP_COUNTER_RANGES)[number],
                },
              });
            }

            requestAnimationFrame(() =>
              document.getElementById(`${triggerId}-criterion`)?.focus(),
            );
          }}
        >
          <SelectTrigger
            ref={criterionTrigger}
            id={`${triggerId}-criterion`}
            className="h-8 w-full gap-1 border-type-red/40 bg-background! bg-linear-to-b from-type-red/10 to-type-red/10 px-1 text-[10px]"
            aria-label={t("tools.pvp.stats.selectDefenseSlot", { slot })}
          >
            <SelectValue className="min-w-0" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="student">
                {t("tools.pvp.stats.counterSlotStudent")}
              </SelectItem>
              {PVP_COUNTER_RANGES.map((range) => (
                <SelectItem key={range} value={`range:${range}`}>
                  {t("tools.pvp.stats.counterSlotRange", { range })}
                </SelectItem>
              ))}
              <SelectItem value="tank">
                {t("tools.pvp.stats.counterSlotTank")}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )}

      {searchMode && index >= 4 && (
        <div className="hidden h-8 @min-[600px]/formation:block" />
      )}

      <div className="relative h-[73px] w-[78px]">
        <div style={{ zoom: 0.82 }}>
          {criterion ? (
            card
          ) : (
            <StudentPicker
              students={students}
              onStudentSelected={(student) =>
                onUpdate(index, { student, counter: undefined })
              }
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                focusIcon();
              }}
            >
              {card}
            </StudentPicker>
          )}
        </div>

        {(item.student || criterion) && (
          <Button
            type="button"
            variant="secondary"
            size="icon-xs"
            className="absolute -right-2 -top-2 rounded-full border-2 border-background opacity-0 shadow-md group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
            aria-label={t("tools.pvp.stats.removeDefenseStudent", {
              name: item.student?.name ?? criterionLabel ?? "criterion",
            })}
            onClick={() => {
              onUpdate(index, { student: undefined, counter: undefined });
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
    </div>
  );
}
