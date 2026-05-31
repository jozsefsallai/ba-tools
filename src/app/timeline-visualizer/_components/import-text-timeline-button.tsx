"use client";

import type { TimelineItem } from "@/app/timeline-visualizer/_components/timeline-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useStudents } from "@/hooks/use-students";
import { parseTimelineFromText } from "@/lib/timeline-text-format";
import { CircleHelpIcon, UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { v4 as uuid } from "uuid";

export type ImportTextTimelineButtonProps = {
  onImport: (items: TimelineItem[]) => void;
};

export function ImportTextTimelineButton({
  onImport,
}: ImportTextTimelineButtonProps) {
  const t = useTranslations();
  const { students } = useStudents();

  const closeRef = useRef<HTMLButtonElement>(null);

  const [rawTimeline, setRawTimeline] = useState("");

  function onWantsToImportTextTimeline() {
    const raw = rawTimeline.trim();

    if (!raw) {
      toast.warning(t("tools.timeline.import.toasts.empty"));
      return;
    }

    const parsed = parseTimelineFromText(raw, students);
    const importedItems: TimelineItem[] = parsed.items.map((item) => ({
      ...item,
      id: uuid(),
    }));

    if (importedItems.length === 0) {
      toast.warning(t("tools.timeline.import.toasts.empty"));
      return;
    }

    onImport(importedItems);
    closeRef.current?.click();

    toast.success(
      t("tools.timeline.import.toasts.success", {
        count: importedItems.length,
      }),
    );

    if (parsed.unresolved.length > 0) {
      const unresolvedNames = Array.from(new Set(parsed.unresolved)).join(", ");
      toast.warning(
        t("tools.timeline.import.toasts.warningSkipped", {
          names: unresolvedNames,
        }),
      );
    }

    setRawTimeline("");
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UploadIcon />
          {t("tools.timeline.import.button")}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("tools.timeline.import.dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("tools.timeline.import.dialog.description")}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          autoFocus
          className="h-[200px] resize-none"
          value={rawTimeline}
          onChange={(e) => setRawTimeline(e.target.value)}
          placeholder={t("tools.timeline.import.dialog.placeholder")}
        />

        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" className="w-fit px-0">
              <CircleHelpIcon />
              {t("tools.timeline.import.help.button")}
            </Button>
          </DialogTrigger>

          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("tools.timeline.import.help.title")}</DialogTitle>
              <DialogDescription>
                {t("tools.timeline.import.help.description")}
              </DialogDescription>
            </DialogHeader>

            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>{t("tools.timeline.import.help.rules.trigger")}</li>
              <li>{t("tools.timeline.import.help.rules.target")}</li>
              <li>{t("tools.timeline.import.help.rules.notes")}</li>
              <li>{t("tools.timeline.import.help.rules.copy")}</li>
              <li>{t("tools.timeline.import.help.rules.text")}</li>
              <li>{t("tools.timeline.import.help.rules.newline")}</li>
              <li>{t("tools.timeline.import.help.rules.studentNaming")}</li>
            </ul>

            <div className="space-y-1">
              <p className="text-sm font-medium">
                {t("tools.timeline.import.help.exampleLabel")}
              </p>
              <pre className="overflow-auto rounded-md bg-muted p-2 text-xs whitespace-pre-wrap">
                {t("tools.timeline.import.help.example")}
              </pre>
            </div>
          </DialogContent>
        </Dialog>

        <DialogFooter>
          <Button type="button" onClick={onWantsToImportTextTimeline}>
            {t("tools.timeline.import.dialog.submit")}
          </Button>
        </DialogFooter>

        <DialogClose ref={closeRef} />
      </DialogContent>
    </Dialog>
  );
}
