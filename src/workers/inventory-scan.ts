import {
  buildIconTemplates,
  type IconTemplates,
} from "@/lib/inventory-scan/icons";
import { scanInventoryScreenshot } from "@/lib/inventory-scan/scan";
import type {
  InventoryScanRequest,
  InventoryScanResponse,
  InventoryScanResult,
} from "@/lib/inventory-scan/worker-types";

// Larger screenshots are shrunk, which loses nothing that's needed
const MAX_WIDTH = 2400;

// Frames of videos that are kept to be shown
const IMAGE_QUALITY = 0.9;

let templates: IconTemplates | undefined;

async function scan(
  file: Blob | ImageBitmap,
  keepImage: boolean,
): Promise<InventoryScanResult> {
  if (!templates) {
    throw new Error("The scanner is not initialized");
  }

  const bitmap =
    file instanceof ImageBitmap ? file : await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!context) {
    throw new Error("Canvas rendering unavailable");
  }

  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const screenshot = scanInventoryScreenshot(
    {
      width,
      height,
      pixels: context.getImageData(0, 0, width, height).data,
    },
    templates,
  );

  return {
    width,
    height,
    screenshot,
    image:
      keepImage && screenshot
        ? await canvas.convertToBlob({
            type: "image/jpeg",
            quality: IMAGE_QUALITY,
          })
        : undefined,
  };
}

self.onmessage = async ({ data }: MessageEvent<InventoryScanRequest>) => {
  if (data.kind === "init") {
    templates = buildIconTemplates(data.catalog.icons, data.templates);
    return;
  }

  try {
    self.postMessage({
      id: data.id,
      result: await scan(data.file, data.keepImage),
    } satisfies InventoryScanResponse);
  } catch (error) {
    self.postMessage({
      id: data.id,
      error: error instanceof Error ? error.message : "Scan failed",
    } satisfies InventoryScanResponse);
  }
};
