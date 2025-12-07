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
  const [jsonImport, setJsonImport] = useState("");

  const closeRef = useRef<HTMLButtonElement>(null);

  function onWantsToImportStudentData() {
    try {
      const data = JSON.parse(jsonImport) as JustinPlannerExportData;

      if (data.exportVersion !== 2) {
        toast.error("Invalid Justin planner data.");
      }

      importJustinPlannerData(students, data);
      closeRef.current?.click();

      toast.success("Student data imported successfully");
    } catch (err) {
      console.error(err);
      toast.error("Invalid student data provided.");
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Justin planner student data</DialogTitle>
          <DialogDescription>
            Enter the JSON you've copied from Justin planner.
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
            Import
          </Button>
        </DialogFooter>

        <DialogClose ref={closeRef} />
      </DialogContent>
    </Dialog>
  );
}
