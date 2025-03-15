import type { BlockedCoords } from "@/app/inventory-management/_components/grid";
import { Storage } from "@/lib/storage";
import type { InventoryManagementItem } from "@/workers/types";

export type AoiInventoryData = {
  first: InventoryManagementItem;
  second: InventoryManagementItem;
  third: InventoryManagementItem;

  blockedCells: BlockedCoords[];
};

export class AoiInventoryStorage extends Storage<AoiInventoryData> {
  constructor() {
    super("aoi_inventory");
  }
}

export const aoiInventoryStorage = new AoiInventoryStorage();
