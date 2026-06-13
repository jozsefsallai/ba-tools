"use client";

import type { RosterItem } from "@/app/user/rosters/_components/roster-item-editor";
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
  type JustinPlannerExportData,
  justinToRosterItems,
} from "@/lib/justin";
import { useTranslations } from "next-intl";
import { type PropsWithChildren, useRef, useState } from "react";
import { toast } from "sonner";
import type { Student } from "~prisma";

export type ImportJustinRosterDialogProps = PropsWithChildren & {
  students: Student[];
  onImport: (items: RosterItem[]) => void;
};

export function ImportJustinRosterDialog({
  students,
  onImport,
  children,
}: ImportJustinRosterDialogProps) {
  const t = useTranslations();
  const [jsonImport, setJsonImport] = useState("");

  const closeRef = useRef<HTMLButtonElement>(null);

  function onWantsToImportRoster() {
    try {
      const data = JSON.parse(jsonImport) as JustinPlannerExportData;

      if (data.exportVersion !== 2) {
        toast.error(
          t("tools.roster.editor.importJustinPlanner.toasts.invalidJustinData"),
        );
        return;
      }

      const items = justinToRosterItems(students, data);
      onImport(items);
      closeRef.current?.click();

      toast.success(
        t("tools.roster.editor.importJustinPlanner.toasts.success"),
      );
    } catch (err) {
      console.error(err);
      toast.error(
        t("tools.roster.editor.importJustinPlanner.toasts.invalidData"),
      );
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("tools.roster.editor.importJustinPlanner.title")}
          </DialogTitle>
          <DialogDescription>
            {t("tools.roster.editor.importJustinPlanner.description")}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          autoFocus
          className="h-[200px] resize-none"
          value={jsonImport}
          onChange={(e) => setJsonImport(e.target.value)}
        />

        <DialogFooter>
          <Button type="submit" onClick={onWantsToImportRoster}>
            {t("common.import")}
          </Button>
        </DialogFooter>

        <DialogClose ref={closeRef} />
      </DialogContent>
    </Dialog>
  );
}
