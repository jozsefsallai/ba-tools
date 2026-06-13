"use client";

import type { RosterItem } from "@/app/user/rosters/_components/roster-item-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { rosterItemsToJustinPlanner } from "@/lib/justin";
import { TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type PropsWithChildren, useState } from "react";

export type ExportJustinRosterDialogProps = PropsWithChildren & {
  rosterItems: RosterItem[];
};

export function ExportJustinRosterDialog({
  rosterItems,
  children,
}: ExportJustinRosterDialogProps) {
  const t = useTranslations();
  const [exportJson, setExportJson] = useState("");

  function handleOpenChange(open: boolean) {
    if (open) {
      setExportJson(JSON.stringify(rosterItemsToJustinPlanner(rosterItems)));
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("tools.roster.editor.exportJustinPlanner.title")}
          </DialogTitle>
          <DialogDescription>
            {t("tools.roster.editor.exportJustinPlanner.description")}
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-400/70 bg-amber-50/40 text-foreground dark:border-amber-500/50 dark:bg-amber-950/30 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400 *:data-[slot=alert-description]:text-foreground">
          <TriangleAlertIcon />
          <AlertDescription>
            {t("tools.roster.editor.exportJustinPlanner.warning")}
          </AlertDescription>
        </Alert>

        <Textarea
          value={exportJson}
          onClick={(e) => e.currentTarget.select()}
          readOnly
          autoFocus
          className="h-[200px] resize-none"
        />
      </DialogContent>
    </Dialog>
  );
}
