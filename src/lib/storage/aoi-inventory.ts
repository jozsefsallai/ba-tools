import type { BlockedCoords } from "@/app/inventory-management/_components/grid";
import { Storage } from "@/lib/storage";
import type { InventoryManagementItem } from "@/workers/types";

export type OldAoiInventoryData = {
  first: InventoryManagementItem;
  second: InventoryManagementItem;
  third: InventoryManagementItem;

  blockedCells: BlockedCoords[];
};

export type AoiInventoryDataSlot = {
  savedAt: number;

  first: InventoryManagementItem;
  second: InventoryManagementItem;
  third: InventoryManagementItem;

  blockedCells: BlockedCoords[];
};

export type AoiInventoryData = {
  slot1?: AoiInventoryDataSlot;
  slot2?: AoiInventoryDataSlot;
  slot3?: AoiInventoryDataSlot;
};

export type AoiInventorySlot = keyof AoiInventoryData;

export class AoiInventoryStorage extends Storage<AoiInventoryData> {
  constructor() {
    super("aoi_inventory");
  }

  get(): AoiInventoryData | null {
    const data = super.get() as AoiInventoryData | OldAoiInventoryData | null;
    if (!data) {
      return null;
    }

    if ("blockedCells" in data) {
      return this.upgrade(data);
    }

    return data;
  }

  upgrade(data: OldAoiInventoryData) {
    const newData: AoiInventoryData = {
      slot1: {
        savedAt: Date.now(),
        first: data.first,
        second: data.second,
        third: data.third,
        blockedCells: data.blockedCells,
      },
    };

    super.set(newData);

    return newData;
  }
}

export const aoiInventoryStorage = new AoiInventoryStorage();
