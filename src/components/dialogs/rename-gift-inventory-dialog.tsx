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
import { type PropsWithChildren, useEffect, useRef, useState } from "react";

export type RenameGiftInventoryDialogProps = PropsWithChildren<{
  current: string;
  onRename?: (name: string) => any;
}>;

export function RenameGiftInventoryDialog({
  current,
  onRename,
  children,
}: RenameGiftInventoryDialogProps) {
  const t = useTranslations();
  const [name, setName] = useState(current);

  const closeRef = useRef<HTMLButtonElement>(null);

  async function handleRename() {
    await onRename?.(name);
    closeRef.current?.click();
  }

  useEffect(() => {
    setName(current);
  }, [current]);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("common.dialogs.renameGiftInventory.title")}</DialogTitle>
          <DialogDescription>
            {t("common.dialogs.renameGiftInventory.description")}
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder={t("common.dialogs.renameGiftInventory.placeholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <DialogFooter>
          <DialogClose ref={closeRef} />

          <Button type="submit" onClick={handleRename}>
            {t("common.dialogs.renameGiftInventory.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
