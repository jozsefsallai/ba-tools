"use client";

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
import {
  timelineStorage,
  type TimelineStorageData,
} from "@/lib/storage/timeline";
import { useTranslations } from "next-intl";
import { useRef, useState, type PropsWithChildren } from "react";
import { toast } from "sonner";

export type ImportTimelineDataDialogProps = PropsWithChildren<{
  onComplete?: () => void;
}>;

export function ImportTimelineDataDialog({
  children,
  onComplete,
}: ImportTimelineDataDialogProps) {
  const t = useTranslations();
  const [jsonImport, setJsonImport] = useState("");

  const closeRef = useRef<HTMLButtonElement>(null);

  function onWantsToImportTimelineData() {
    try {
      const data = JSON.parse(jsonImport) as TimelineStorageData;
      timelineStorage.set(data);
      closeRef.current?.click();
      toast.success(t("common.dialogs.importTimelineData.toasts.success"));
      onComplete?.();
    } catch (err) {
      console.error(err);
      toast.error(t("common.dialogs.importTimelineData.toasts.invalidData"));
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("common.dialogs.importTimelineData.title")}</DialogTitle>
          <DialogDescription>
            {t("common.dialogs.importTimelineData.description")}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          autoFocus
          className="h-[200px] resize-none"
          value={jsonImport}
          onChange={(e) => setJsonImport(e.target.value)}
        />

        <DialogFooter>
          <Button type="submit" onClick={onWantsToImportTimelineData}>
            {t("common.import")}
          </Button>
        </DialogFooter>

        <DialogClose ref={closeRef} />
      </DialogContent>
    </Dialog>
  );
}
