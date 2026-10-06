import {
  cachePvpOpponentName,
  recognizePvpOpponentName,
} from "@/actions/pvp-opponent-name";
import type { PvpPixelImage } from "@/lib/pvp";
import { drawPvpPixels } from "@/lib/pvp/canvas";
import type { PvpOpponentNameRecognition } from "@/lib/pvp/opponent-name-types";
import { startTransition } from "react";

function runNameAction<T>(
  action: () => Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  signal.throwIfAborted();

  return new Promise<T>((resolve, reject) => {
    const cancel = () => reject(signal.reason);

    signal.addEventListener("abort", cancel, { once: true });

    startTransition(async () => {
      try {
        signal.throwIfAborted();
        const result = await action();
        signal.throwIfAborted();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        signal.removeEventListener("abort", cancel);
      }
    });
  });
}

export async function recognizeRemoteOpponentName(
  crop: PvpPixelImage,
  signal: AbortSignal,
  levelEnd?: number,
): Promise<PvpOpponentNameRecognition> {
  const started = performance.now();

  try {
    const canvas = document.createElement("canvas");
    if (!drawPvpPixels(canvas, crop)) {
      throw new Error("Canvas unavailable");
    }

    const image = canvas.toDataURL("image/png").split(",")[1];

    const result = await runNameAction(
      () => recognizePvpOpponentName({ image, levelEnd }),
      AbortSignal.any([signal, AbortSignal.timeout(25000)]),
    );

    if (!result) {
      throw new Error("Name recognition unavailable");
    }

    signal.throwIfAborted();

    return result;
  } catch (error) {
    if (signal.aborted) {
      throw error;
    }

    return {
      name: null,
      source: "unresolved",
      uncertain: true,
      diagnostics: {
        error: "Name recognition unavailable",
        elapsedMs: performance.now() - started,
      },
    };
  }
}

export async function saveOpponentNameCache(
  receipt: string,
  matchId: string,
  seasonId: string,
) {
  const saved = await runNameAction(
    () => cachePvpOpponentName({ receipt, matchId, seasonId }),
    AbortSignal.timeout(4000),
  );

  if (!saved) {
    throw new Error("Name cache update failed");
  }
}
