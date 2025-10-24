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
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "default",
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const [inProgress, setInProgress] = useState(false);

  const closeRef = useRef<HTMLButtonElement>(null);

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
            {confirmText}
          </Button>

          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={inProgress}
          >
            {cancelText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
