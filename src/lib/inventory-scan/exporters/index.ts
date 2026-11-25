import { justinPlannerExporter } from "@/lib/inventory-scan/exporters/justin-planner";
import type { InventoryExporter } from "@/lib/inventory-scan/exporters/types";

export const INVENTORY_EXPORTERS: InventoryExporter[] = [
  justinPlannerExporter,
];
