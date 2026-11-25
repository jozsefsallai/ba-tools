import { loadItemIconCatalog } from "@/lib/inventory-scan/catalog";
import type { ItemIconCatalog } from "@/lib/inventory-scan/catalog-format";
import type {
  InventoryScanRequest,
  InventoryScanResponse,
  InventoryScanResult,
} from "@/lib/inventory-scan/worker-types";

type Job = {
  id: number;
  file: Blob | ImageBitmap;
  keepImage: boolean;
  resolve: (result: InventoryScanResult) => void;
  reject: (error: Error) => void;
};

const MAX_WORKERS = 6;

// Devices with this many GB of memory or less get fewer workers
const LOW_MEMORY = 4;

/** Scans screenshots in a few workers, in the order they're added. */
export class InventoryScanClient {
  private loading: Promise<ItemIconCatalog> | null = null;
  private workers: Worker[] = [];
  private running = new Map<Worker, Job>();
  private queue: Job[] = [];
  private nextId = 0;
  private disposed = false;

  /** Loads the icons once. A failed attempt can be repeated. */
  load() {
    this.loading ??= this.start().catch((error) => {
      this.loading = null;
      throw error;
    });

    return this.loading;
  }

  private async start() {
    const { catalog, templates } = await loadItemIconCatalog();

    if (this.disposed) {
      throw new DOMException("Scan canceled", "AbortError");
    }

    // Each worker holds its own copy of the icons
    const memory = (
      navigator as Navigator & {
        deviceMemory?: number;
      }
    ).deviceMemory;

    const count = Math.max(
      1,
      Math.min(
        memory !== undefined && memory <= LOW_MEMORY ? 2 : MAX_WORKERS,
        (navigator.hardwareConcurrency ?? 2) - 2,
      ),
    );

    for (let i = 0; i < count; i++) {
      const worker = new Worker(
        new URL("../../workers/inventory-scan.ts", import.meta.url),
      );

      worker.onmessage = ({ data }: MessageEvent<InventoryScanResponse>) => {
        const job = this.running.get(worker);
        this.running.delete(worker);

        if (data.error !== undefined) {
          job?.reject(new Error(data.error));
        } else {
          job?.resolve(data.result);
        }

        this.runNext();
      };

      worker.onerror = (event) => {
        const job = this.running.get(worker);
        this.running.delete(worker);
        job?.reject(new Error(event.message || "Scan failed"));
        this.runNext();
      };

      worker.postMessage({
        kind: "init",
        catalog,
        templates,
      } satisfies InventoryScanRequest);

      this.workers.push(worker);
    }

    return catalog;
  }

  private runNext() {
    for (const worker of this.workers) {
      if (this.running.has(worker)) {
        continue;
      }

      const job = this.queue.shift();

      if (!job) {
        return;
      }

      this.running.set(worker, job);
      worker.postMessage(
        {
          kind: "scan",
          id: job.id,
          file: job.file,
          keepImage: job.keepImage,
        } satisfies InventoryScanRequest,
        job.file instanceof ImageBitmap
          ? [
              job.file,
            ]
          : [],
      );
    }
  }

  /** Scans a screenshot, or a frame of a video, which this takes over. */
  async scan(
    file: Blob | ImageBitmap,
    {
      keepImage = false,
    }: {
      keepImage?: boolean;
    } = {},
  ) {
    try {
      await this.load();
    } catch (error) {
      if (file instanceof ImageBitmap) {
        file.close();
      }

      throw error;
    }

    return new Promise<InventoryScanResult>((resolve, reject) => {
      if (this.disposed) {
        if (file instanceof ImageBitmap) {
          file.close();
        }

        reject(new DOMException("Scan canceled", "AbortError"));
        return;
      }

      this.queue.push({
        id: this.nextId++,
        file,
        keepImage,
        resolve,
        reject,
      });
      this.runNext();
    });
  }

  dispose() {
    this.disposed = true;

    for (const worker of this.workers) {
      worker.terminate();
    }

    for (const job of [
      ...this.running.values(),
      ...this.queue,
    ]) {
      if (job.file instanceof ImageBitmap) {
        job.file.close();
      }

      job.reject(new DOMException("Scan canceled", "AbortError"));
    }

    this.workers = [];
    this.running.clear();
    this.queue = [];
  }
}
