"use client";

import type { TimelineItem as TimelineItemType } from "@/app/timeline-visualizer/_components/timeline-preview";
import { StudentPicker } from "@/components/common/student-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { buildStudentIconUrl } from "@/lib/url";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Student } from "@prisma/client";
import { ChevronsUpDownIcon, GripVerticalIcon, XIcon } from "lucide-react";

export type TimelineItemProps = {
  item: TimelineItemType;
  onWantsToRemove(item: TimelineItemType): void;
  onWantsToUpdate(
    item: TimelineItemType,
    data: Omit<TimelineItemType, "type" | "student" | "id">,
  ): void;
  allStudents?: Student[];
};

export function TimelineItem({
  item,
  onWantsToRemove,
  onWantsToUpdate,
  allStudents = [],
}: TimelineItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id, animateLayoutChanges: () => false });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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

  return (
    <article
      ref={setNodeRef}
      className="bg-background border rounded-md p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      style={style}
      {...attributes}
    >
      <div className="flex md:items-center gap-4 flex-1">
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
                <div className="text-xl font-bold">{item.student.name}</div>

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
                        className="w-full justify-between"
                      >
                        {item.target
                          ? `${item.target.name}`
                          : "Select Target Student"}
                        <ChevronsUpDownIcon />
                      </Button>
                    </StudentPicker>

                    {item.target && (
                      <Button
                        variant="outline"
                        onClick={() => handleTargetUpdate(null)}
                      >
                        <XIcon />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-12">
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
            <div className="text-center text-xl text-muted-foreground">
              {item.orientation === "horizontal" ? "Horizontal" : "Vertical"}{" "}
              separator
            </div>
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
          <Button variant="destructive" onClick={handleRemove}>
            Remove
          </Button>
        </div>
      </div>
    </article>
  );
}
