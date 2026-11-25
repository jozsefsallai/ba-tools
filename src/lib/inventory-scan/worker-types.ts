import type { ItemIconCatalog } from "@/lib/inventory-scan/catalog-format";
import type { ScannedScreenshot } from "@/lib/inventory-scan/types";

export type InventoryScanRequest =
  | {
      kind: "init";
      catalog: ItemIconCatalog;
      templates: Uint8Array;
    }
  | {
      kind: "scan";
      id: number;
      /** A screenshot, or a frame of a video */
      file: Blob | ImageBitmap;
      /** Send back the image, for showing frames of videos */
      keepImage: boolean;
    };

export type InventoryScanResult = {
  /** Size the screenshot was scanned at, which the cells' places refer to */
  width: number;
  height: number;
  /** Null when there's no item list in the image */
  screenshot: ScannedScreenshot | null;
  /** The image as scanned, when it was asked for and has an item list */
  image?: Blob;
};

export type InventoryScanResponse =
  | {
      id: number;
      result: InventoryScanResult;
      error?: never;
    }
  | {
      id: number;
      error: string;
      result?: never;
    };
