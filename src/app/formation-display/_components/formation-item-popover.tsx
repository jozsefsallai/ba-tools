"use client";

import type { StudentItem } from "@/app/formation-display/_components/formation-preview";
import {
  StarLevelInput,
  type StarLevelInputValue,
} from "@/components/common/star-level-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PopoverContent } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Trash2Icon } from "lucide-react";
import { useCallback } from "react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations();

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

  const handleStarsUpdate = useCallback(
    (value: StarLevelInputValue) => {
      onWantsToUpdate(item.id, {
        starLevel: value.starLevel,
        ueLevel: value.ueLevel,
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
      onWantsToUpdate(item.id, {
        starter: checked,
        ...(checked ? {} : { starterOrder: undefined }),
      });
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

          <div className="flex flex-col gap-2">
            <Label className="shrink-0">Stars</Label>

            <StarLevelInput
              className="flex-1 items-center"
              value={{ starLevel: item.starLevel, ueLevel: item.ueLevel }}
              onValueChanged={handleStarsUpdate}
            />
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
            <Label htmlFor={`pop-starter-${item.id}`}>
              {t("tools.formationDisplay.starter")}
            </Label>
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
