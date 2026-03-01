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
import { studentStorage } from "@/lib/storage/students";
import { useTranslations } from "next-intl";
import type { PropsWithChildren } from "react";

export type ExportStudentDataDialogProps = PropsWithChildren;

export function ExportStudentDataDialog({
  children,
}: ExportStudentDataDialogProps) {
  const t = useTranslations();

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("common.dialogs.exportStudentData.title")}</DialogTitle>
          <DialogDescription>
            {t("common.dialogs.exportStudentData.description")}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={JSON.stringify(studentStorage.get())}
          onClick={(e) => e.currentTarget.select()}
          readOnly
          autoFocus
          className="h-[200px] resize-none"
        />
      </DialogContent>
    </Dialog>
  );
}
