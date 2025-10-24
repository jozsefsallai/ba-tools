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
import { type PropsWithChildren, useRef, useState } from "react";

export type CreateGiftInventoryDialogProps = PropsWithChildren<{
  onCreate?: (name: string) => any;
}>;

export function CreateGiftInventoryDialog({
  onCreate,
  children,
}: CreateGiftInventoryDialogProps) {
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
          <DialogTitle>Create gift inventory</DialogTitle>
          <DialogDescription>
            Enter the name of the new gift inventory.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Gift Inventory Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <DialogFooter>
          <DialogClose ref={closeRef} />

          <Button type="submit" onClick={handleCreate}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
