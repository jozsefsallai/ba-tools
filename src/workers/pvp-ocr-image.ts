import type { PvpPreparedReport } from "@/lib/pvp/ocr-image";
import { preparePvpReport } from "@/lib/pvp/ocr-image";
import type { PVPScreenshotROIs } from "@/lib/pvp/screenshot-types";
import type { PvpWorkerResponse } from "@/lib/pvp/worker-types";

self.addEventListener("message", (event: MessageEvent<PVPScreenshotROIs>) => {
  try {
    self.postMessage({
      result: preparePvpReport(event.data),
    } satisfies PvpWorkerResponse<PvpPreparedReport>);
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : "Unable to segment report",
    } satisfies PvpWorkerResponse<PvpPreparedReport>);
  }
});
