import type { ScanParcelType } from "@/lib/inventory-scan/types";

// Change this when the templates or the catalog's shape change
export const ITEM_ICON_CATALOG_FORMAT = 1;

// Icons are 304x240, so a template pixel is an 8x8 block
export const ITEM_ICON_WIDTH = 38;
export const ITEM_ICON_HEIGHT = 30;
export const ITEM_ICON_PIXELS = ITEM_ICON_WIDTH * ITEM_ICON_HEIGHT;
export const ITEM_ICON_BYTES = ITEM_ICON_PIXELS * 4;

export type ItemIcon = {
  parcelType: ScanParcelType;
  rarity: "N" | "R" | "SR" | "SSR";
  /** Every item with this icon, ascending, apart from the consumables */
  itemIds: number[];
  /** The game lists boxes and such before everything else */
  consumableIds: number[];
};

export type ItemIconCatalog = {
  format: typeof ITEM_ICON_CATALOG_FORMAT;
  /** Gzipped RGBA templates, `ITEM_ICON_BYTES` each, in the icons' order */
  asset: string;
  icons: ItemIcon[];
};
