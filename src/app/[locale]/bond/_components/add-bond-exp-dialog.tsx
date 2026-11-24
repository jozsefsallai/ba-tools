"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, type PropsWithChildren, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type AddBondExpDialogProps = PropsWithChildren<{
  onAdd: (exp: number) => void;
}>;

export function AddBondExpDialog({ onAdd, children }: AddBondExpDialogProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const exp = Number.parseInt(value, 10);
  const valid = !Number.isNaN(exp) && exp > 0;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setValue("");
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) {
      return;
    }
    onAdd(exp);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("tools.bond.student.addExp.title")}</DialogTitle>
            <DialogDescription>
              {t("tools.bond.student.addExp.description")}
            </DialogDescription>
          </DialogHeader>

          <Input
            type="number"
            min={1}
            autoFocus
            placeholder={t("tools.bond.student.addExp.placeholder")}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />

          <DialogFooter>
            <Button type="submit" disabled={!valid}>
              {t("tools.bond.student.addExp.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
