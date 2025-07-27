"use client";

import type { StudentItem } from "@/app/formation-display/_components/formation-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { StarLevel, UELevel } from "@/lib/types";
import { buildStudentIconUrl } from "@/lib/url";
import { useSortable } from "@dnd-kit/sortable";
import { GripVerticalIcon } from "lucide-react";
import { CSS } from "@dnd-kit/utilities";

export type FormationItemProps = {
  item: StudentItem;
  onWantsToRemove(item: StudentItem): void;
  onWantsToUpdate(
    item: StudentItem,
    data: Omit<StudentItem, "student" | "id">,
  ): void;
};

export function FormationItem({
  item,
  onWantsToRemove,
  onWantsToUpdate,
}: FormationItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id, animateLayoutChanges: () => false });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function handleRemove() {
    onWantsToRemove(item);
  }

  function handleLevelUpdate(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.value === "") {
      return;
    }

    const level = Number.parseInt(event.target.value, 10);
    if (Number.isNaN(level)) {
      return;
    }

    onWantsToUpdate(item, { level });
  }

  function handleStarLevelUpdate(newValue: StarLevel) {
    onWantsToUpdate(item, { starLevel: newValue });
  }

  function handleUELevelUpdate(newValue: UELevel | undefined) {
    onWantsToUpdate(item, { ueLevel: newValue });
  }

  function handleBorrowedUpdate(newValue: boolean) {
    onWantsToUpdate(item, { borrowed: newValue });
  }

  function handleStaterUpdate(newValue: boolean) {
    onWantsToUpdate(item, { starter: newValue });
  }

  return (
    <article
      ref={setNodeRef}
      className="bg-background border rounded-md p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      style={style}
      {...attributes}
    >
      <div className="flex md:items-center gap-4">
        <Button className="cursor-move" variant="ghost" {...listeners}>
          <GripVerticalIcon />
        </Button>

        <img
          src={buildStudentIconUrl(item.student)}
          alt={item.student.name}
          className="h-12 md:h-24"
        />

        <div className="flex flex-col gap-2">
          <div className="text-xl font-bold">{item.student.name}</div>

          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="level">Level:</Label>

              <Input
                id="level"
                type="number"
                min={1}
                value={item.level ?? ""}
                onChange={handleLevelUpdate}
                className="w-22"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label>Stars:</Label>

              <Select
                value={item.starLevel?.toString() ?? ""}
                onValueChange={(value) =>
                  handleStarLevelUpdate(Number.parseInt(value, 10) as StarLevel)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label>UE:</Label>

              <Select
                value={item.ueLevel?.toString() ?? ""}
                onValueChange={(value) =>
                  handleUELevelUpdate(
                    value === "-"
                      ? undefined
                      : (Number.parseInt(value, 10) as UELevel),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="-">None</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="borrowed"
                key={`${item.student.id}:borrowed`}
                checked={item.borrowed}
                onCheckedChange={handleBorrowedUpdate}
              />
              <Label htmlFor="borrowed">Borrowed</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="starter"
                key={`${item.student.id}:starter`}
                checked={item.starter}
                onCheckedChange={handleStaterUpdate}
              />
              <Label htmlFor="starter">Starter</Label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <Button variant="destructive" onClick={handleRemove}>
          Remove
        </Button>
      </div>
    </article>
  );
}
