import type { PvpPixelImage } from "@/lib/pvp";
import { type PvpIconCatalog, matchPvpIcon } from "@/lib/pvp/icon-match";

let catalog: PvpIconCatalog | undefined;
let templates: Uint8Array | undefined;

self.onmessage = (
  event: MessageEvent<
    | { kind: "init"; catalog: PvpIconCatalog; templates: Uint8Array }
    | { kind: "match"; images: PvpPixelImage[]; allowedIds?: string[] }
  >,
) => {
  try {
    if (event.data.kind === "init") {
      catalog = event.data.catalog;
      templates = event.data.templates;
      self.postMessage({ result: [] });
      return;
    }

    if (!catalog || !templates) {
      throw new Error("Icon matching is not initialized");
    }

    const allowed = event.data.allowedIds && new Set(event.data.allowedIds);

    self.postMessage({
      result: event.data.images.map((image) => {
        return matchPvpIcon(
          image,
          catalog as PvpIconCatalog,
          templates as Uint8Array,
          allowed,
        );
      }),
    });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Icon matching failed",
    });
  }
};
