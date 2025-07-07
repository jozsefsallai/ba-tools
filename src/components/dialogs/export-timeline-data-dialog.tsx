"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { timelineStorage } from "@/lib/storage/timeline";
import { useState, type PropsWithChildren } from "react";

export type ExportTimelineDataDialogProps = PropsWithChildren & {
  onBeforeLoad?: () => void;
};

export function ExportTimelineDataDialog({
  onBeforeLoad,
  children,
}: ExportTimelineDataDialogProps) {
  const [json, setJson] = useState("");

  function handleOpenChange(open: boolean) {
    if (open) {
      onBeforeLoad?.();
    }

    setJson(JSON.stringify(timelineStorage.get()));
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export timeline data</DialogTitle>
          <DialogDescription>
            Copy the following JSON string to import your saved timeline info
            into a different device/browser or after clearing your local
            storage.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={json}
          onClick={(e) => e.currentTarget.select()}
          readOnly
          autoFocus
          className="h-[200px] resize-none"
        />
      </DialogContent>
    </Dialog>
  );
}
