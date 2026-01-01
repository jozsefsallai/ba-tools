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
import { useTranslations } from "next-intl";
import { type PropsWithChildren, useRef, useState } from "react";

export type ConfirmDialogProps = PropsWithChildren<{
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "default" | "destructive";
  onConfirm?: () => any;
  onCancel?: () => any;
}>;

export function ConfirmDialog({
  title,
  description,
  confirmText,
  cancelText,
  confirmVariant = "default",
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const t = useTranslations();

  const [inProgress, setInProgress] = useState(false);

  const closeRef = useRef<HTMLButtonElement>(null);

  const finalConfirmText = confirmText ?? t("common.dialogs.confirm.confirm");
  const finalCancelText = cancelText ?? t("common.dialogs.confirm.cancel");

  async function handleConfirm() {
    if (inProgress) {
      return;
    }

    setInProgress(true);
    await onConfirm?.();
    setInProgress(false);

    closeRef.current?.click();
  }

  async function handleCancel() {
    if (inProgress) {
      return;
    }

    setInProgress(true);
    await onCancel?.();
    setInProgress(false);

    closeRef.current?.click();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose ref={closeRef} />

          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={inProgress}
          >
            {finalConfirmText}
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
