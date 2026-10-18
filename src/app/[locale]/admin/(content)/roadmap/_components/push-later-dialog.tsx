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
import { DAY_MS } from "@/lib/roadmap/constants";
import type { EditableRoadmapItem } from "@/lib/roadmap/types";
import { useTranslations } from "next-intl";
import { useState } from "react";

export type PushPrompt = {
  item: EditableRoadmapItem;
  offsetMs: number;
  categoryItems: EditableRoadmapItem[];
  subtype: { label: string; items: EditableRoadmapItem[] } | null;
};

export function PushLaterDialog({
  prompt,
  onConfirm,
  onClose,
}: {
  prompt: PushPrompt | null;
  onConfirm: (items: EditableRoadmapItem[]) => Promise<void>;
  onClose: () => void;
}) {
  const t = useTranslations();
  const labels = useRoadmapLabels();
  const [busy, setBusy] = useState(false);

  if (!prompt) {
    return null;
  }

  const days = prompt.offsetMs / DAY_MS;
  const sign = prompt.offsetMs > 0 ? "+" : "−";
  const offset = Number.isInteger(days)
    ? `${sign}${labels.t("static.roadmap.duration", { count: Math.abs(days) })}`
    : `${sign}${Math.round(Math.abs(prompt.offsetMs) / 3_600_000)}h`;

  const confirm = async (items: EditableRoadmapItem[]) => {
    setBusy(true);
    await onConfirm(items);
    setBusy(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {prompt.offsetMs > 0
              ? t("tools.admin.roadmap.push.titleLater")
              : t("tools.admin.roadmap.push.titleEarlier")}
          </DialogTitle>

          <DialogDescription>
            {t.rich("tools.admin.roadmap.push.description", {
              strong: (chunks) => <strong>{chunks}</strong>,
              name: labels.fullTitle(prompt.item),
              offset,
            })}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          {prompt.subtype && (
            <Button
              disabled={busy}
              onClick={() => confirm(prompt.subtype?.items ?? [])}
            >
              {t("tools.admin.roadmap.push.subtype", {
                count: prompt.subtype.items.length,
                subtype: prompt.subtype.label,
              })}
            </Button>
          )}

          <Button
            disabled={busy}
            variant={prompt.subtype ? "secondary" : "default"}
            onClick={() => confirm(prompt.categoryItems)}
          >
            {t("tools.admin.roadmap.push.category", {
              count: prompt.categoryItems.length,
              category: labels.category(prompt.item.kind),
            })}
          </Button>

          <Button disabled={busy} variant="outline" onClick={onClose}>
            {t("tools.admin.roadmap.push.onlyThis")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
