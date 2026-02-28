"use client";

import type { PropsWithChildren } from "react";

import FormationDisplay from "@/how-to-use/formation-display.mdx";
import InventoryManagement from "@/how-to-use/inventory-management.mdx";
import Bond from "@/how-to-use/bond.mdx";
import ScenarioImageGenerator from "@/how-to-use/scenario-image-generator.mdx";
import TimelineVisualizer from "@/how-to-use/timeline-visualizer.mdx";
import RailoadPuzzleSolver from "@/how-to-use/railroad-puzzle-solver.mdx";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTranslations } from "next-intl";

export type HelpSheetProps = PropsWithChildren<{
  document:
    | "formation-display"
    | "inventory-management"
    | "bond"
    | "scenario-image-generator"
    | "timeline-visualizer"
    | "railroad-puzzle-solver";
}>;

const TITLE_KEYS = {
  "formation-display": "common.helpSheet.formationDisplay",
  "inventory-management": "common.helpSheet.inventoryManagement",
  bond: "common.helpSheet.bond",
  "scenario-image-generator": "common.helpSheet.scenarioImageGenerator",
  "timeline-visualizer": "common.helpSheet.timelineVisualizer",
  "railroad-puzzle-solver": "common.helpSheet.railroadPuzzleSolver",
} as const;

export function HelpSheet({ document, children }: HelpSheetProps) {
  const t = useTranslations();
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>

      <SheetContent className="!max-w-full w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>{t(TITLE_KEYS[document])}</SheetTitle>
        </SheetHeader>

        <article className="prose dark:prose-invert p-4 pt-0 overflow-y-auto">
          {document === "formation-display" && <FormationDisplay />}
          {document === "inventory-management" && <InventoryManagement />}
          {document === "bond" && <Bond />}
          {document === "scenario-image-generator" && (
            <ScenarioImageGenerator />
          )}
          {document === "timeline-visualizer" && <TimelineVisualizer />}
          {document === "railroad-puzzle-solver" && <RailoadPuzzleSolver />}
        </article>
      </SheetContent>
    </Sheet>
  );
}
