"use client";

import type { TimelineItem as TimelineItemType } from "@/app/timeline-visualizer/_components/timeline-preview";
import { TimelineQuickAdd } from "@/app/timeline-visualizer/_components/timeline-quick-add";
import { StudentCard } from "@/components/common/student-card";
import { StudentPicker } from "@/components/common/student-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { type SkillCardVariant, skillCardVariantMap } from "@/lib/skill-card";
import { buildStudentIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Student } from "@prisma/client";
import {
  ChevronsUpDownIcon,
  CopyIcon,
  GripVerticalIcon,
  XIcon,
} from "lucide-react";
import { type SetStateAction, useEffect, useMemo, useState } from "react";
import { v4 as uuid } from "uuid";

export type TimelineItemProps = {
  item: TimelineItemType;
  setItems: React.Dispatch<SetStateAction<TimelineItemType[]>>;
  onWantsToRemove(item: TimelineItemType): void;
  onWantsToUpdate(
    item: TimelineItemType,
    data: Omit<TimelineItemType, "type" | "student" | "id">,
  ): void;
  onWantsToAddBelow?(below: TimelineItemType, item: TimelineItemType): void;
  allStudents?: Student[];
  uniqueStudents?: Student[];
  highlighted?: boolean;
};

export function TimelineItem({
  item,
  setItems,
  onWantsToRemove,
  onWantsToUpdate,
  onWantsToAddBelow,
  allStudents = [],
  uniqueStudents = [],
  highlighted = false,
}: TimelineItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id, animateLayoutChanges: () => false });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [separatorOverride, setSeparatorOverride] = useState(
    item.type === "separator" && typeof item.size === "number",
  );
  const [separatorSizeStr, setSeparatorSizeStr] = useState<string | undefined>(
    item.type === "separator" ? item.size?.toString() : undefined,
  );

  function handleRemove() {
    onWantsToRemove(item);
  }

  function handleTriggerUpdate(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.value === "") {
      onWantsToUpdate(item, { trigger: undefined });
      return;
    }

    onWantsToUpdate(item, { trigger: event.target.value });
  }

  function handleTargetUpdate(student: Student | null) {
    if (!student) {
      onWantsToUpdate(item, { target: undefined });
      return;
    }

    onWantsToUpdate(item, { target: student });
  }

  function insertStudentBelow(student: Student) {
    return onWantsToAddBelow?.(item, {
      type: "student",
      id: uuid(),
      student,
    });
  }

  function insertSeparatorBelow(orientation: "horizontal" | "vertical") {
    return onWantsToAddBelow?.(item, {
      type: "separator",
      id: uuid(),
      orientation,
    });
  }

  function insertTextBelow() {
    return onWantsToAddBelow?.(item, {
      type: "text",
      id: uuid(),
      text: "Enter text",
    });
  }

  function duplicate() {
    const newItem: TimelineItemType = {
      ...item,
      id: uuid(),
    };

    setItems((prev) => [...prev, newItem]);
  }

  const skillVariants = useMemo(() => {
    if (item.type !== "student") {
      return [];
    }

    const variants = skillCardVariantMap[item.student.id as SkillCardVariant];
    if (!variants) {
      return [];
    }

    return variants;
  }, [item]);

  useEffect(() => {
    if (!separatorOverride) {
      onWantsToUpdate(item, { size: undefined });
    } else if (typeof separatorSizeStr === "string") {
      const value = Number.parseInt(separatorSizeStr, 10);
      if (!Number.isNaN(value)) {
        onWantsToUpdate(item, { size: value });
      }
    }
  }, [separatorOverride]);

  useEffect(() => {
    if (item.type !== "separator" || !separatorOverride) {
      return;
    }

    const value = Number.parseInt(separatorSizeStr ?? "", 10);
    if (!Number.isNaN(value)) {
      onWantsToUpdate(item, { size: value });
    }
  }, [separatorSizeStr]);

  return (
    <article
      ref={setNodeRef}
      className="bg-background relative border rounded-md p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 group"
      style={style}
      id={item.id}
      {...attributes}
    >
      {highlighted && (
        <div className="absolute inset-0 border-2 bg-yellow-300 opacity-20 rounded-md pointer-events-none" />
      )}

      <div className="relative flex md:items-center gap-4 flex-1">
        <Button className="cursor-move" variant="ghost" {...listeners}>
          <GripVerticalIcon />
        </Button>

        <div className="flex-1 flex md:items-center gap-4">
          {item.type === "student" && (
            <>
              <img
                src={buildStudentIconUrl(item.student)}
                alt={item.student.name}
                className="h-14"
              />

              <div className="flex flex-col gap-1">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="text-xl font-bold">{item.student.name}</div>

                  {skillVariants.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`variant-${item.id}`}>Variant:</Label>

                      <Select
                        value={item.variantId ?? "default"}
                        onValueChange={(value) =>
                          onWantsToUpdate(item, { variantId: value })
                        }
                      >
                        <SelectTrigger>
                          {skillVariants.find((v) => v.id === item.variantId)
                            ?.name ?? "Default"}
                        </SelectTrigger>

                        <SelectContent>
                          {skillVariants.map((variant) => (
                            <SelectItem key={variant.id} value={variant.id}>
                              {variant.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`trigger-${item.id}`}>Trigger:</Label>

                    <Input
                      id={`trigger-${item.id}`}
                      value={item.trigger ?? ""}
                      placeholder="Cost, time, etc."
                      onChange={handleTriggerUpdate}
                      className="w-32"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Label htmlFor={`target-${item.id}`}>Target:</Label>

                    <StudentPicker
                      students={allStudents}
                      onStudentSelected={handleTargetUpdate}
                      className="w-[90vw] md:w-[450px]"
                    >
                      <Button
                        variant="outline"
                        className="w-[220px] justify-between"
                      >
                        {item.target
                          ? `${item.target.name}`
                          : "Select Target Student"}
                        <ChevronsUpDownIcon />
                      </Button>
                    </StudentPicker>

                    {uniqueStudents.length > 0 && (
                      <div className="px-1 flex gap-1">
                        {uniqueStudents.map((student) => (
                          <button
                            key={student.id}
                            type="button"
                            className={cn("cursor-pointer", {
                              "opacity-50":
                                !!item.target && item.target.id !== student.id,
                            })}
                            style={{ zoom: 0.4 }}
                            onClick={() =>
                              handleTargetUpdate(
                                item.target?.id === student.id ? null : student,
                              )
                            }
                          >
                            <StudentCard student={student} busy={false} />
                          </button>
                        ))}
                      </div>
                    )}

                    {item.target && (
                      <Button
                        variant="outline"
                        onClick={() => handleTargetUpdate(null)}
                      >
                        <XIcon />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id={`copy-${item.id}`}
                      checked={!!item.copy}
                      onCheckedChange={(checked) =>
                        onWantsToUpdate(item, { copy: checked })
                      }
                    />

                    <Label htmlFor={`copy-${item.id}`}>Copy</Label>
                  </div>
                </div>
              </div>
            </>
          )}

          {item.type === "separator" && (
            <>
              <div className="text-center text-xl text-muted-foreground">
                {item.orientation === "horizontal" ? "Horizontal" : "Vertical"}{" "}
                separator
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id={`sizeOverride-${item.id}`}
                  checked={separatorOverride}
                  onCheckedChange={(checked) => setSeparatorOverride(checked)}
                />

                <Label htmlFor={`sizeOverride-${item.id}`}>Override Size</Label>
              </div>

              {separatorOverride && (
                <Input
                  type="number"
                  value={separatorSizeStr ?? ""}
                  placeholder="Size in pixels"
                  onChange={(e) => setSeparatorSizeStr(e.target.value)}
                  className="w-32"
                />
              )}
            </>
          )}

          {item.type === "text" && (
            <div className="flex-1">
              <Input
                value={item.text}
                placeholder="Enter text"
                onChange={(e) =>
                  onWantsToUpdate(item, { text: e.target.value })
                }
                className="w-full"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <Button variant="outline" onClick={duplicate} title="Duplicate">
            <CopyIcon />
          </Button>

          <Button variant="destructive" onClick={handleRemove}>
            Remove
          </Button>
        </div>
      </div>

      <div className="hidden group-hover:flex items-center gap-2 absolute -top-4 right-4 border rounded-md shadow-md bg-background py-1 px-3 text-xs">
        <strong>Add Below</strong>

        <TimelineQuickAdd
          students={uniqueStudents}
          onStudentClick={insertStudentBelow}
          small
        />

        <button
          type="button"
          className="skew-x-[-11deg] rounded-[11%] w-[30px] h-[26px] hover:bg-secondary border flex items-center justify-center cursor-pointer"
          onClick={() => insertSeparatorBelow("horizontal")}
          title="Insert Horizontal Separator"
        >
          <div className="skew-x-[11deg] text-xs font-bold">HS</div>
        </button>

        <button
          type="button"
          className="skew-x-[-11deg] rounded-[11%] w-[30px] h-[26px] hover:bg-secondary border flex items-center justify-center cursor-pointer"
          onClick={() => insertSeparatorBelow("vertical")}
          title="Insert Vertical Separator"
        >
          <div className="skew-x-[11deg] text-xs font-bold">VS</div>
        </button>

        <button
          type="button"
          className="skew-x-[-11deg] rounded-[11%] w-[30px] h-[26px] hover:bg-secondary border flex items-center justify-center cursor-pointer"
          onClick={insertTextBelow}
          title="Insert Text Item"
        >
          <div className="skew-x-[11deg] text-xs font-bold">T</div>
        </button>
      </div>
    </article>
  );
}
