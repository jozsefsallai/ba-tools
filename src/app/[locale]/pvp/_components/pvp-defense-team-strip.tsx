"use client";

import type { PVPFormationStudentItem } from "@/app/[locale]/pvp/_lib/types";
import { EmptyCard } from "@/components/common/empty-card";
import { StudentCard } from "@/components/common/student-card";
import { StudentPicker } from "@/components/common/student-picker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PVP_COUNTER_RANGES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GripVerticalIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
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
  const t = useTranslations();

  const draggingIndex = useRef<number | null>(null);
  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function getCandidates(index: number) {
    const combatClass = index < 4 ? "Main" : "Support";

    return students.filter((student) => {
      const isCurrent = student.id === formation[index].student?.id;

      const isUsedElsewhere = formation.some(
        (item, itemIndex) =>
          itemIndex !== index && item.student?.id === student.id,
      );

      return (
        (student.combatClass === combatClass && !isUsedElsewhere) || isCurrent
      );
    });
  }

  function criterionValue(index: number) {
    const criterion = formation[index].counter;

    if (!criterion) {
      return "student";
    }

    if (criterion.kind === "tank") {
      return "tank";
    }

    return `range:${criterion.value}`;
  }

  function updateCriterion(index: number, value: string) {
    if (value === "student") {
      onUpdate(index, { counter: undefined });
    } else if (value === "tank") {
      onUpdate(index, { student: undefined, counter: { kind: "tank" } });
    } else {
      onUpdate(index, {
        student: undefined,
        counter: {
          kind: "range",
          value: Number(value.slice(6)) as (typeof PVP_COUNTER_RANGES)[number],
        },
      });
    }
  }

  function handleDrop(index: number) {
    const from = draggingIndex.current;
    draggingIndex.current = null;

    setDraggingSlot(null);
    setDragOverIndex(null);

    if (from === null || from === index || from < 4 !== index < 4) {
      return;
    }

    onMove(from, index);
  }

  return (
    <div className="-mx-2 overflow-x-auto px-2 pb-2">
      <div className="flex min-w-max items-end justify-center gap-2 sm:gap-3">
        {formation.map((item, index) => (
          <div
            key={index}
            className={cn(
              "group relative rounded-xl p-1 transition-colors",
              dragOverIndex === index && "bg-primary/15 ring-2 ring-primary/60",
              draggingSlot === index && "opacity-45",
            )}
            draggable={Boolean(item.student || item.counter)}
            onDragStart={(event) => {
              draggingIndex.current = index;
              setDraggingSlot(index);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", String(index));
            }}
            onDragEnd={() => {
              draggingIndex.current = null;
              setDraggingSlot(null);
              setDragOverIndex(null);
            }}
            onDragOver={(event) => {
              if (
                draggingIndex.current !== null &&
                draggingIndex.current < 4 === index < 4
              ) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverIndex(index);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop(index);
            }}
          >
            <div
              className="relative rounded-lg focus-within:ring-2 focus-within:ring-primary"
              style={{ zoom: 0.72 }}
            >
              {searchMode && index < 4 && (
                <Select
                  value={criterionValue(index)}
                  onValueChange={(value) => updateCriterion(index, value)}
                >
                  <SelectTrigger className="mb-1 h-7 w-24 gap-1 px-2 text-[10px]">
                    <SelectValue className="min-w-0" />
                  </SelectTrigger>

                  <SelectContent>
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
                  </SelectContent>
                </Select>
              )}

              <div className="relative h-[88px] w-[95px]">
                {(!searchMode || index >= 4 || !item.counter) && (
                  <StudentPicker
                    students={getCandidates(index)}
                    onStudentSelected={(student) =>
                      onUpdate(index, { student, counter: undefined })
                    }
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto rounded-lg p-0 hover:bg-transparent"
                      aria-label={t("tools.pvp.stats.selectDefenseSlot", {
                        slot: index < 4 ? `D${index + 1}` : `S${index + 1}`,
                      })}
                    >
                      {item.student ? (
                        <StudentCard student={item.student} />
                      ) : (
                        <EmptyCard className="w-[95px]" />
                      )}
                    </Button>
                  </StudentPicker>
                )}

                {searchMode && index < 4 && item.counter && (
                  <EmptyCard
                    className="w-[95px] border-primary/60 bg-primary/20 opacity-80"
                    label={
                      item.counter.kind === "tank"
                        ? t("tools.pvp.stats.counterCardTank")
                        : t("tools.pvp.stats.counterCardRange", {
                            range: item.counter.value,
                          })
                    }
                  />
                )}

                {(item.student || item.counter) && (
                  <button
                    type="button"
                    className="absolute -right-2 -top-2 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full border-2 border-background bg-foreground text-background opacity-0 shadow-md transition-opacity hover:border-destructive hover:bg-destructive hover:text-white group-hover:opacity-100 focus:opacity-100"
                    aria-label={t("tools.pvp.stats.removeDefenseStudent", {
                      name: item.student?.name ?? "criterion",
                    })}
                    onClick={() =>
                      onUpdate(index, {
                        student: undefined,
                        counter: undefined,
                      })
                    }
                  >
                    <XIcon className="size-4" />
                  </button>
                )}
              </div>
            </div>

            <div
              className={cn(
                "mx-auto mt-1 flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-none text-white",
                index < 4 ? "bg-type-red" : "bg-type-blue",
              )}
            >
              {(item.student || item.counter) && (
                <GripVerticalIcon className="size-3" />
              )}
              {index < 4 ? `D${index + 1}` : `S${index + 1}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
