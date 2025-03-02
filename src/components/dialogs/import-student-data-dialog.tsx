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
  setStudentStorage,
  type StudentStorageItem,
} from "@/lib/student-storage";
import { useRef, useState, type PropsWithChildren } from "react";
import { toast } from "sonner";

export type ImportStudentDataDialogProps = PropsWithChildren;

export function ImportStudentDataDialog({
  children,
}: ImportStudentDataDialogProps) {
  const [jsonImport, setJsonImport] = useState("");

  const closeRef = useRef<HTMLButtonElement>(null);

  function onWantsToImportStudentData() {
    try {
      const data = JSON.parse(jsonImport) as StudentStorageItem[];

      if (!Array.isArray(data)) {
        throw new Error("Invalid data format");
      }

      setStudentStorage(data);
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
          <DialogTitle>Import cached student data</DialogTitle>
          <DialogDescription>
            Enter the JSON you've copied earlier.
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
