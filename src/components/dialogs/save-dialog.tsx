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
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

export type SaveDialogProps = {
  open: boolean;
  setOpen?: (open: boolean) => any;
  title: string;
  description: string;
  yesText?: string;
  noText?: string;
  cancelText?: string;
  onYes: () => any;
  onNo?: () => any;
  onCancel: () => any;
};

export function SaveDialog({
  open,
  setOpen,
  title,
  description,
  yesText,
  noText,
  cancelText,
  onYes,
  onNo,
  onCancel,
}: SaveDialogProps) {
  const t = useTranslations();

  const [inProgress, setInProgress] = useState(false);

  const closeRef = useRef<HTMLButtonElement>(null);

  const finalYesText = yesText ?? t("common.dialogs.save.yes");
  const finalNoText = noText ?? t("common.dialogs.save.no");
  const finalCancelText = cancelText ?? t("common.dialogs.save.cancel");

  async function handleYes() {
    if (inProgress) {
      return;
    }

    setInProgress(true);
    await onYes();
    setInProgress(false);

    closeRef.current?.click();
  }

  async function handleNo() {
    if (inProgress) {
      return;
    }

    setInProgress(true);
    await onNo?.();
    setInProgress(false);

    closeRef.current?.click();
  }

  async function handleCancel() {
    if (inProgress) {
      return;
    }

    setInProgress(true);
    await onCancel();
    setInProgress(false);

    closeRef.current?.click();
  }

  async function handleOpenChange(open: boolean) {
    if (!open) {
      await handleCancel();
    }

    setOpen?.(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose ref={closeRef} />

          <Button onClick={handleYes} disabled={inProgress}>
            {finalYesText}
          </Button>

          <Button variant="outline" onClick={handleNo} disabled={inProgress}>
            {finalNoText}
          </Button>

          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={inProgress}
          >
            {finalCancelText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
