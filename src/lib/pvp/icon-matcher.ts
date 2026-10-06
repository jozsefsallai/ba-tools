import type { PvpOcrProgress, PvpPixelImage } from "@/lib/pvp";
import {
  PVP_ICON_CATALOG_FORMAT,
  PVP_ICON_TEMPLATE_BYTES,
  type PvpIconCatalog,
  type PvpIconMatch,
} from "@/lib/pvp/icon-match";

import type {
  PvpIconWorkerRequest,
  PvpWorkerResponse,
} from "@/lib/pvp/worker-types";

export class PvpIconMatcher {
  private worker: Worker | null = null;
  private loading: Promise<void> | null = null;
  private generation = 0;
  private names = new Map<string, string>();
  private pending?: {
    resolve: (value: PvpIconMatch[]) => void;
    reject: (error: Error) => void;
  };

  async warmup(onProgress?: (progress: PvpOcrProgress) => void) {
    if (this.loading) {
      return this.loading;
    }

    const generation = this.generation;

    this.loading = (async () => {
      onProgress?.({ stage: "loading", progress: 0 });

      const manifest = await fetch("/pvp-icons/manifest.json", {
        cache: "no-cache",
      });

      if (!manifest.ok) {
        throw new Error("Unable to load student icon catalog");
      }

      const catalog: PvpIconCatalog = await manifest.json();

      if (
        catalog.format !== PVP_ICON_CATALOG_FORMAT ||
        !Array.isArray(catalog.students) ||
        !/^[a-f0-9]{16}\.bin$/.test(catalog.asset)
      ) {
        throw new Error("Invalid student icon catalog");
      }

      const response = await fetch(`/pvp-icons/${catalog.asset}`);
      if (!response.ok) {
        throw new Error("Unable to load student icon templates");
      }

      const templates = new Uint8Array(await response.arrayBuffer());
      if (
        templates.length !==
        catalog.students.length * PVP_ICON_TEMPLATE_BYTES
      ) {
        throw new Error("Incomplete student icon templates");
      }

      if (generation !== this.generation) {
        throw new DOMException("Import canceled", "AbortError");
      }

      this.names = new Map(
        catalog.students.map((student) => [student.id, student.name]),
      );

      this.worker = new Worker(
        new URL("../../workers/pvp-icon-match.ts", import.meta.url),
      );

      this.worker.onmessage = (
        event: MessageEvent<PvpWorkerResponse<PvpIconMatch[]>>,
      ) => {
        const pending = this.pending;
        this.pending = undefined;

        if (event.data.error !== undefined) {
          pending?.reject(new Error(event.data.error));
        } else {
          pending?.resolve(event.data.result);
        }
      };

      this.worker.onerror = (event) => {
        this.pending?.reject(new Error(event.message));
        this.pending = undefined;
      };

      await this.request({ kind: "init", catalog, templates }, [
        templates.buffer,
      ]);

      onProgress?.({ stage: "loading", progress: 1 });
    })().catch((error) => {
      if (generation === this.generation) {
        this.dispose();
      }

      throw error;
    });

    return this.loading;
  }

  private request(
    message: PvpIconWorkerRequest,
    transfer: Transferable[] = [],
  ) {
    return new Promise<PvpIconMatch[]>((resolve, reject) => {
      if (!this.worker || this.pending) {
        reject(new Error("Icon worker is unavailable"));
        return;
      }

      this.pending = { resolve, reject };
      this.worker.postMessage(message, transfer);
    });
  }

  async match(images: PvpPixelImage[], allowedIds?: string[]) {
    await this.warmup();

    const copies = images.map((image) => ({
      ...image,
      pixels: image.pixels.slice(),
    }));

    return this.request(
      { kind: "match", images: copies, allowedIds },
      copies.map((image) => image.pixels.buffer),
    );
  }

  studentName(id: string) {
    return this.names.get(id);
  }

  dispose() {
    this.generation++;
    this.worker?.terminate();
    this.worker = null;
    this.loading = null;
    this.names.clear();
    this.pending?.reject(new DOMException("Import canceled", "AbortError"));
    this.pending = undefined;
  }
}
