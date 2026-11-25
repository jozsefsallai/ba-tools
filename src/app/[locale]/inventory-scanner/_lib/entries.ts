import type {
  MergedInventory,
  MissingSpot,
  ScannedItem,
} from "@/lib/inventory-scan/merge";
import type { ScopedItem } from "@/lib/inventory-scan/scope";
import type { InventoryScanResult } from "@/lib/inventory-scan/worker-types";

/** A screenshot, or a frame read from a video. */
export type ScreenshotState = {
  id: string;
  file: Blob;
  name: string;
  url: string;
  status: "queued" | "done" | "failed";
  result: InventoryScanResult | null;
  /** Place in the list of uploads */
  order: number;
  /** Set for frames of a video */
  video?: {
    upload: string;
    /** Seconds into the video */
    time: number;
  };
};

export type VideoState = {
  id: string;
  file: File;
  url: string;
  order: number;
  status: "reading" | "done" | "failed" | "unsupported";
  /** How far it's been read, from 0 to 1 */
  progress: number;
};

/** What the user added: screenshots and videos, but not frames of videos. */
export type Upload =
  | ({
      kind: "screenshot";
    } & ScreenshotState)
  | ({
      kind: "video";
    } & VideoState);

/** Some systems leave the type of recordings empty. */
export function isVideoFile(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name);
}

/** "1:05" */
export function formatVideoTime(seconds: number) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** Counts the user typed in, by item key. An empty string means no count. */
export type Edits = Record<string, string>;

export type InventoryEntry = {
  key: string;
  item: ScopedItem;
  scanned: ScannedItem | null;
  /** Null when the count isn't known */
  count: number | null;
  /** The list shows that there are none of this item */
  absent: boolean;
  edited: boolean;
  /** The reading is doubtful, and the user hasn't corrected it */
  needsCheck: boolean;
  approximate: boolean;
  /** Where the screenshots skip the item, when its count isn't known */
  missing: MissingSpot | null;
};

export const entryKey = (item: Pick<ScopedItem, "parcelType" | "itemId">) =>
  `${item.parcelType}:${item.itemId}`;

function parseCount(text: string) {
  const value = Number.parseInt(text, 10);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function buildEntries(
  items: ScopedItem[],
  inventory: MergedInventory | null,
  edits: Edits,
): InventoryEntry[] {
  const scannedItems = new Map(
    inventory?.items.map((item) => [
      entryKey(item),
      item,
    ]),
  );

  return items.map((item) => {
    const key = entryKey(item);
    const scanned = scannedItems.get(key) ?? null;
    const edited = key in edits;
    const absent =
      !scanned && (inventory?.isAbsent(item.parcelType, item.itemId) ?? false);

    return {
      key,
      item,
      scanned,
      absent,
      edited,
      count: edited
        ? parseCount(edits[key])
        : (scanned?.value ?? (absent ? 0 : null)),
      needsCheck:
        !edited && scanned !== null && (scanned.uncertain || scanned.conflict),
      approximate: !edited && (scanned?.approximate ?? false),
      missing:
        inventory && !scanned && !absent
          ? inventory.locateMissing(item.parcelType, item.itemId)
          : null,
    };
  });
}
