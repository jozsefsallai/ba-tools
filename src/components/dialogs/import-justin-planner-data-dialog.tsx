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
  importJustinPlannerData,
  type JustinPlannerExportData,
} from "@/lib/justin";
import { useTranslations } from "next-intl";
import type { Student } from "~prisma";
import { useRef, useState, type PropsWithChildren } from "react";
import { toast } from "sonner";

export type ImportJustinPlannerDataDialogProps = PropsWithChildren & {
  students: Student[];
};

export function ImportJustinPlannerDataDialog({
  students,
  children,
}: ImportJustinPlannerDataDialogProps) {
  const t = useTranslations();
  const [jsonImport, setJsonImport] = useState("");

  const closeRef = useRef<HTMLButtonElement>(null);

  function onWantsToImportStudentData() {
    try {
      const data = JSON.parse(jsonImport) as JustinPlannerExportData;

      if (data.exportVersion !== 2) {
        toast.error(t("common.dialogs.importJustinPlannerData.toasts.invalidJustinData"));
      }

      importJustinPlannerData(students, data);
      closeRef.current?.click();

      toast.success(t("common.dialogs.importJustinPlannerData.toasts.success"));
    } catch (err) {
      console.error(err);
      toast.error(t("common.dialogs.importJustinPlannerData.toasts.invalidData"));
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("common.dialogs.importJustinPlannerData.title")}</DialogTitle>
          <DialogDescription>
            {t("common.dialogs.importJustinPlannerData.description")}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          autoFocus
          className="h-[200px] resize-none"
          value={jsonImport}
          onChange={(e) => setJsonImport(e.target.value)}
        />

        <DialogFooter>
          <Button type="submit" onClick={onWantsToImportStudentData}>
            {t("common.import")}
          </Button>
        </DialogFooter>

        <DialogClose ref={closeRef} />
      </DialogContent>
    </Dialog>
  );
}
