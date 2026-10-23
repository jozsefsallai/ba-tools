import type { PvpPreparedReport } from "@/lib/pvp/ocr-image";
import { preparePvpReport } from "@/lib/pvp/ocr-image";
import type {
  PvpPrepareRequest,
  PvpWorkerResponse,
} from "@/lib/pvp/worker-types";

self.addEventListener("message", (event: MessageEvent<PvpPrepareRequest>) => {
  try {
    self.postMessage({
      result: preparePvpReport(event.data.rois, event.data.templates),
    } satisfies PvpWorkerResponse<PvpPreparedReport>);
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : "Unable to segment report",
    } satisfies PvpWorkerResponse<PvpPreparedReport>);
  }
});
