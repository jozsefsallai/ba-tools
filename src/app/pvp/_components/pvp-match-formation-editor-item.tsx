"use client";

import type { PVPFormationStudentItem } from "@/app/pvp/_lib/types";
import { EmptyCard } from "@/components/common/empty-card";
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
  SelectValue,
} from "@/components/ui/select";
import {
  STAR_LEVELS,
  type StarLevel,
  UE_LEVELS,
  type UELevel,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Student } from "@prisma/client";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { type FormEvent, useCallback, useState } from "react";

export type PVPMatchFormationEditorItemProps = {
  item: PVPFormationStudentItem;
  index: number;
  strikerPrefix?: "A" | "D";
  onUpdate(idx: number, item: Partial<PVPFormationStudentItem>): any;
};

export function PVPMatchFormationEditorItem({
  item,
  index,
  strikerPrefix,
  onUpdate,
}: PVPMatchFormationEditorItemProps) {
  const [levelStr, setLevelStr] = useState(item.level?.toString() ?? "");
  const [damageStr, setDamageStr] = useState(item.damage?.toString() ?? "");

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

  const handleStarLevelUpdate = useCallback(
    (starLevel: string) => {
      if (starLevel === "_") {
        onUpdate(index, { starLevel: undefined });
        return;
      }

      onUpdate(index, {
        starLevel: Number.parseInt(starLevel, 10) as StarLevel,
      });
    },
    [onUpdate, index],
  );

  const handleUELevelUpdate = useCallback(
    (ueLevel: string) => {
      if (ueLevel === "_") {
        onUpdate(index, { ueLevel: undefined });
        return;
      }

      onUpdate(index, { ueLevel: Number.parseInt(ueLevel, 10) as UELevel });
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
          <StudentPicker onStudentSelected={handleStudentUpdate}>
            <Button variant="outline" className="flex-1 justify-between">
              {item.student ? item.student.name : "Select Student"}
              <ChevronDownIcon />
            </Button>
          </StudentPicker>

          {item.student && (
            <Button variant="outline" onClick={handleStudentClear}>
              <XIcon />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Level</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={levelStr}
              onChange={handleLevelUpdate}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs">Star Level</Label>
            <Select
              value={item.starLevel?.toString() ?? "_"}
              onValueChange={handleStarLevelUpdate}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="_">None</SelectItem>

                {STAR_LEVELS.map((level) => (
                  <SelectItem key={level} value={level.toString()}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs">UE Level</Label>
            <Select
              value={item.ueLevel?.toString() ?? "_"}
              onValueChange={handleUELevelUpdate}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="_">None</SelectItem>

                {UE_LEVELS.map((level) => (
                  <SelectItem key={level} value={level.toString()}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs">Damage</Label>
            <Input
              type="number"
              min={0}
              value={damageStr}
              onChange={handleDamageUpdate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
