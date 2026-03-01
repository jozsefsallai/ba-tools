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
  studentStorage,
  type StudentStorageItem,
} from "@/lib/storage/students";
import { useTranslations } from "next-intl";
import { useRef, useState, type PropsWithChildren } from "react";
import { toast } from "sonner";

export type ImportStudentDataDialogProps = PropsWithChildren;

export function ImportStudentDataDialog({
  children,
}: ImportStudentDataDialogProps) {
  const t = useTranslations();
  const [jsonImport, setJsonImport] = useState("");

  const closeRef = useRef<HTMLButtonElement>(null);

  function onWantsToImportStudentData() {
    try {
      const data = JSON.parse(jsonImport) as StudentStorageItem[];

      if (!Array.isArray(data)) {
        throw new Error("Invalid data format");
      }

      studentStorage.set(data);
      closeRef.current?.click();

      toast.success(t("common.dialogs.importStudentData.toasts.success"));
    } catch (err) {
      console.error(err);
      toast.error(t("common.dialogs.importStudentData.toasts.invalidData"));
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("common.dialogs.importStudentData.title")}</DialogTitle>
          <DialogDescription>
            {t("common.dialogs.importStudentData.description")}
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
