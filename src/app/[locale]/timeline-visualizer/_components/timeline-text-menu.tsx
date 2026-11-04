"use client";

import { ChevronDownIcon, CopyIcon, UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ImportTextTimelineDialog } from "@/app/[locale]/timeline-visualizer/_components/import-text-timeline-dialog";
import type { TimelineItem } from "@/app/[locale]/timeline-visualizer/_components/timeline-preview";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { serializeTimelineToText } from "@/lib/timeline-text-format";

export type TimelineTextMenuProps = {
  items: TimelineItem[];
  onImport: (items: TimelineItem[]) => void;
};

export function TimelineTextMenu({ items, onImport }: TimelineTextMenuProps) {
  const t = useTranslations();

  const [importOpen, setImportOpen] = useState(false);

  async function copyToClipboard() {
    await navigator.clipboard.writeText(serializeTimelineToText(items));
    toast.success(t("tools.timeline.copy.copiedToast"));
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            {t("tools.timeline.actions.textTimeline")}
            <ChevronDownIcon />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setImportOpen(true)}>
            <UploadIcon />
            {t("tools.timeline.import.button")}
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={items.length === 0}
            onSelect={copyToClipboard}
          >
            <CopyIcon />
            {t("tools.timeline.copy.button")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ImportTextTimelineDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={onImport}
      />
    </>
  );
}
