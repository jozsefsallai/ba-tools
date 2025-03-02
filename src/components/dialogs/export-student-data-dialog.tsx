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
import { getStudentStorage } from "@/lib/student-storage";
import type { PropsWithChildren } from "react";

export type ExportStudentDataDialogProps = PropsWithChildren;

export function ExportStudentDataDialog({
  children,
}: ExportStudentDataDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export cached student data</DialogTitle>
          <DialogDescription>
            Copy the following JSON string to import your saved student stat
            info into a different device/browser or after clearing your local
            storage.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={JSON.stringify(getStudentStorage())}
          onClick={(e) => e.currentTarget.select()}
          readOnly
          autoFocus
          className="h-[200px] resize-none"
        />
      </DialogContent>
    </Dialog>
  );
}
