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
import { useStudents } from "@/hooks/use-students";
import { type EchelonData, parseEchelon } from "@/lib/echelon-parser";
import { type PropsWithChildren, useCallback, useRef, useState } from "react";

const EXAMPLE = `Hikari: lv.90 UE40
Seia [S]: lv.90 4*
Mari (Idol): lv.90 UE40
Chiaki [S]: lv.90 UE60
--
Kisaki: lv.90 UE50
Rio [SA]: lv.90 UE60`;

export type ParseEchelonDataDialogProps = PropsWithChildren<{
  onParse(data: EchelonData): any;
}>;

export function ParseEchelonDataDialog({
  children,
  onParse,
}: ParseEchelonDataDialogProps) {
  const { students } = useStudents();

  const [raw, setRaw] = useState("");

  const closeRef = useRef<HTMLButtonElement>(null);

  const onWantsToParseEchelonData = useCallback(() => {
    const data = parseEchelon(students, raw);
    onParse(data);
    closeRef.current?.click();
  }, [onParse, raw, students]);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Read Formation Data (BETA)</DialogTitle>
          <DialogDescription>Enter the formation data below.</DialogDescription>
        </DialogHeader>

        <Textarea
          autoFocus
          className="h-[200px] resize-none"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={EXAMPLE}
        />

        <DialogFooter>
          <Button type="submit" onClick={onWantsToParseEchelonData}>
            Parse
          </Button>
        </DialogFooter>

        <DialogClose ref={closeRef} />
      </DialogContent>
    </Dialog>
  );
}
