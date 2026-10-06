import {
  type PvpIconCatalog,
  type PvpIconMatch,
  matchPvpIcon,
} from "@/lib/pvp/icon-match";
import type {
  PvpIconWorkerRequest,
  PvpWorkerResponse,
} from "@/lib/pvp/worker-types";

let catalog: PvpIconCatalog | undefined;
let templates: Uint8Array | undefined;

self.onmessage = (event: MessageEvent<PvpIconWorkerRequest>) => {
  try {
    if (event.data.kind === "init") {
      catalog = event.data.catalog;
      templates = event.data.templates;
      self.postMessage({ result: [] } satisfies PvpWorkerResponse<
        PvpIconMatch[]
      >);
      return;
    }

    if (!catalog || !templates) {
      throw new Error("Icon matching is not initialized");
    }

    const activeCatalog = catalog;
    const activeTemplates = templates;

    const allowed = event.data.allowedIds && new Set(event.data.allowedIds);

    self.postMessage({
      result: event.data.images.map((image) => {
        return matchPvpIcon(image, activeCatalog, activeTemplates, allowed);
      }),
    } satisfies PvpWorkerResponse<PvpIconMatch[]>);
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Icon matching failed",
    } satisfies PvpWorkerResponse<PvpIconMatch[]>);
  }
};
