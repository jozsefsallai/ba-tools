"use client";

import type { PropsWithChildren } from "react";

import FormationDisplay from "@/how-to-use/formation-display.mdx";
import InventoryManagement from "@/how-to-use/inventory-management.mdx";
import Bond from "@/how-to-use/bond.mdx";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type HelpSheetProps = PropsWithChildren<{
  document: "formation-display" | "inventory-management" | "bond";
}>;

function getTitle(document: HelpSheetProps["document"]) {
  switch (document) {
    case "formation-display":
      return "Formation Display";
    case "inventory-management":
      return "Inventory Management";
    case "bond":
      return "Relationship Rank Calculator";
  }
}

export function HelpSheet({ document, children }: HelpSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>

      <SheetContent className="!max-w-full w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>{getTitle(document)}</SheetTitle>
        </SheetHeader>

        <article className="prose dark:prose-invert p-4 pt-0 overflow-y-auto">
          {document === "formation-display" && <FormationDisplay />}
          {document === "inventory-management" && <InventoryManagement />}
          {document === "bond" && <Bond />}
        </article>
      </SheetContent>
    </Sheet>
  );
}
