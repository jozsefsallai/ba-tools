import { preparePvpReport } from "@/lib/pvp/ocr-image";
import type { PvpScreenshotROIMap } from "@/lib/pvp/screenshot-types";

self.addEventListener(
  "message",
  (event: MessageEvent<PvpScreenshotROIMap<Uint8ClampedArray>>) => {
    try {
      self.postMessage({ result: preparePvpReport(event.data) });
    } catch (error) {
      self.postMessage({
        error:
          error instanceof Error ? error.message : "Unable to segment report",
      });
    }
  },
);
