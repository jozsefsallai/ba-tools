"use client";

import { useRoadmapLabels } from "@/components/roadmap/use-roadmap-labels";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EditableRoadmapItem } from "@/lib/roadmap/types";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";

export function ShiftDialog({
  item,
  onShift,
  onClose,
}: {
  item: EditableRoadmapItem | null;
  onShift: (item: EditableRoadmapItem, days: number) => void;
  onClose: () => void;
}) {
  const t = useTranslations();
  const labels = useRoadmapLabels();
  const id = useId();
  const [days, setDays] = useState("7");

  useEffect(() => {
    if (item) {
      setDays("7");
    }
  }, [item]);

  if (!item) {
    return null;
  }

  const value = Number.parseInt(days, 10);
  const valid = Number.isFinite(value) && value !== 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) {
              onShift(item, value);
              onClose();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {t("tools.admin.roadmap.shiftDialog.title")}
            </DialogTitle>

            <DialogDescription>
              <strong>{labels.fullTitle(item)}</strong>
              <br />
              {t("tools.admin.roadmap.shiftDialog.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id}>
              {t("tools.admin.roadmap.shiftDialog.days")}
            </Label>

            <Input
              id={id}
              type="number"
              step={1}
              value={days}
              onChange={(event) => setDays(event.target.value)}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>

            <Button type="submit" disabled={!valid}>
              {t("tools.admin.roadmap.shiftDialog.apply")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
