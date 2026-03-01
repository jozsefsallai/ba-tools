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
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { type PropsWithChildren, useRef, useState } from "react";

export type CreateGiftInventoryDialogProps = PropsWithChildren<{
  onCreate?: (name: string) => any;
}>;

export function CreateGiftInventoryDialog({
  onCreate,
  children,
}: CreateGiftInventoryDialogProps) {
  const t = useTranslations();
  const [name, setName] = useState("");

  const closeRef = useRef<HTMLButtonElement>(null);

  async function handleCreate() {
    await onCreate?.(name);
    closeRef.current?.click();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("common.dialogs.createGiftInventory.title")}</DialogTitle>
          <DialogDescription>
            {t("common.dialogs.createGiftInventory.description")}
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder={t("common.dialogs.createGiftInventory.placeholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <DialogFooter>
          <DialogClose ref={closeRef} />

          <Button type="submit" onClick={handleCreate}>
            {t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
