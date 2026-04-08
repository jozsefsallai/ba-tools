"use client";

import type { StudentItem } from "@/app/formation-display/_components/formation-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PopoverContent } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { StarLevel, UELevel } from "@/lib/types";
import { Trash2Icon } from "lucide-react";
import { useCallback } from "react";

function isFormationPreviewAnchorTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest("[data-formation-preview-anchor]")
  );
}

export type FormationItemPopoverProps = {
  item: StudentItem;
  onWantsToRemove: (itemId: string) => void;
  onWantsToUpdate: (
    itemId: string,
    data: Partial<Omit<StudentItem, "student" | "id">>,
  ) => void;
};

export function FormationItemPopover({
  item,
  onWantsToRemove,
  onWantsToUpdate,
}: FormationItemPopoverProps) {
  const handleRemove = useCallback(() => {
    onWantsToRemove(item.id);
  }, [onWantsToRemove, item.id]);

  const handleLevelUpdate = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.value === "") {
        onWantsToUpdate(item.id, { level: undefined });
        return;
      }
      const level = Number.parseInt(event.target.value, 10);
      if (!Number.isNaN(level)) {
        onWantsToUpdate(item.id, { level });
      }
    },
    [onWantsToUpdate, item.id],
  );

  const handleStarLevelUpdate = useCallback(
    (value: string) => {
      if (value === "-") {
        onWantsToUpdate(item.id, { starLevel: undefined });
        return;
      }
      onWantsToUpdate(item.id, {
        starLevel: Number.parseInt(value, 10) as StarLevel,
      });
    },
    [onWantsToUpdate, item.id],
  );

  const handleUELevelUpdate = useCallback(
    (value: string) => {
      if (value === "-") {
        onWantsToUpdate(item.id, { ueLevel: undefined });
        return;
      }
      onWantsToUpdate(item.id, {
        ueLevel: Number.parseInt(value, 10) as UELevel,
      });
    },
    [onWantsToUpdate, item.id],
  );

  const handleBorrowedUpdate = useCallback(
    (checked: boolean) => {
      onWantsToUpdate(item.id, { borrowed: checked });
    },
    [onWantsToUpdate, item.id],
  );

  const handleStarterUpdate = useCallback(
    (checked: boolean) => {
      onWantsToUpdate(item.id, { starter: checked });
    },
    [onWantsToUpdate, item.id],
  );

  return (
    <PopoverContent
      className="w-72 flex flex-col gap-3"
      onOpenAutoFocus={(e) => e.preventDefault()}
      onPointerDownOutside={(e) => {
        if (isFormationPreviewAnchorTarget(e.target)) e.preventDefault();
      }}
      onFocusOutside={(e) => {
        if (isFormationPreviewAnchorTarget(e.target)) e.preventDefault();
      }}
    >
      <div className="font-semibold text-base">
        {item.student?.name ?? "Empty"}
      </div>

      {item.student && (
        <>
          <div className="flex items-center gap-2">
            <Label className="shrink-0" htmlFor={`pop-level-${item.id}`}>
              Level
            </Label>
            <Input
              id={`pop-level-${item.id}`}
              type="number"
              min={1}
              value={item.level ?? ""}
              onChange={handleLevelUpdate}
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label className="shrink-0" htmlFor={`pop-stars-${item.id}`}>
              Stars
            </Label>
            <Select
              value={item.starLevel?.toString() ?? "-"}
              onValueChange={handleStarLevelUpdate}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-">None</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label className="shrink-0" htmlFor={`pop-ue-${item.id}`}>
              UE
            </Label>
            <Select
              value={item.ueLevel?.toString() ?? "-"}
              onValueChange={handleUELevelUpdate}
            >
              <SelectTrigger className="flex-1">
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
              id={`pop-borrowed-${item.id}`}
              checked={!!item.borrowed}
              onCheckedChange={handleBorrowedUpdate}
            />
            <Label htmlFor={`pop-borrowed-${item.id}`}>Borrowed</Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id={`pop-starter-${item.id}`}
              checked={!!item.starter}
              onCheckedChange={handleStarterUpdate}
            />
            <Label htmlFor={`pop-starter-${item.id}`}>Starter</Label>
          </div>
        </>
      )}

      <Separator />

      <Button
        variant="destructive"
        size="sm"
        onClick={handleRemove}
        className="w-full"
      >
        <Trash2Icon className="size-4" />
        Remove
      </Button>
    </PopoverContent>
  );
}
