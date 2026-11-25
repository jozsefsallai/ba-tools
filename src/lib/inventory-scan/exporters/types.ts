import type { ScopedItem } from "@/lib/inventory-scan/scope";

export type ExportEntry = {
  item: ScopedItem;
  count: number;
};

export type InventoryExporter = {
  id: string;
  name: string;
  url: string;
  filename: string;
  /** Whether the planner has a place for this item */
  supports: (item: ScopedItem) => boolean;
  export: (entries: ExportEntry[]) => string;
};
