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
  closeOnSave?: boolean;
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
  closeOnSave = true,
  onYes,
  onNo,
  onCancel,
}: SaveDialogProps) {
  const t = useTranslations();

  const [inProgress, setInProgress] = useState(false);

  const closeRef = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);

  function closeDialog() {
    closing.current = true;

    try {
      closeRef.current?.click();
    } finally {
      closing.current = false;
    }
  }

  const finalYesText = yesText ?? t("common.dialogs.save.yes");
  const finalNoText = noText ?? t("common.dialogs.save.no");
  const finalCancelText = cancelText ?? t("common.dialogs.save.cancel");

  async function handleYes() {
    if (inProgress) {
      return;
    }

    setInProgress(true);
    try {
      await onYes();

      if (closeOnSave) {
        closeDialog();
      }
    } finally {
      setInProgress(false);
    }
  }

  async function handleNo() {
    if (inProgress) {
      return;
    }

    setInProgress(true);

    try {
      await onNo?.();
      closeDialog();
    } finally {
      setInProgress(false);
    }
  }

  async function handleCancel() {
    if (inProgress) {
      return;
    }

    setInProgress(true);

    try {
      await onCancel();
      closeDialog();
    } finally {
      setInProgress(false);
    }
  }

  async function handleOpenChange(open: boolean) {
    if (inProgress && !closing.current) {
      return;
    }

    if (!open && !closing.current) {
      await onCancel();
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
