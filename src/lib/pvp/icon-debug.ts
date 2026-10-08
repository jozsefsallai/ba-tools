import charBg from "@/assets/images/char-bg.png";
import template from "@/assets/images/pvp-template.png";
import { recognizePvpAnonymousOpponent } from "@/lib/pvp/anonymous-icon";
import {
  type Cutout,
  type IconDebugCase,
  type IconDebugResult,
  type IconDebugStudent,
  findTemplateCutouts,
  iconDebugSlotIndices,
} from "@/lib/pvp/icon-debug-results";
import { PvpIconMatcher } from "@/lib/pvp/icon-matcher";
import type { PvpPreparedReport } from "@/lib/pvp/ocr-image";
import { getScreenshotROIs } from "@/lib/pvp/screenshot";
import type { PvpWorkerResponse } from "@/lib/pvp/worker-types";
import { buildStudentIconUrlFromId } from "@/lib/url";

function loadImage(
  url: string,
  signal: AbortSignal,
): Promise<HTMLImageElement> {
  signal.throwIfAborted();

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";

    const cleanup = () => {
      signal.removeEventListener("abort", cancel);
      image.onload = null;
      image.onerror = null;
    };

    const cancel = () => {
      cleanup();
      image.src = "";
      reject(new DOMException("Canceled", "AbortError"));
    };

    image.onload = () => {
      cleanup();
      resolve(image);
    };

    image.onerror = () => {
      cleanup();
      reject(
        new Error(
          `Unable to load image (check CDN availability and CORS): ${url}`,
        ),
      );
    };

    signal.addEventListener("abort", cancel, { once: true });

    image.src = url;
  });
}

function context(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas rendering is unavailable.");
  }

  return ctx;
}

function cover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  box: Cutout,
) {
  const scale = Math.max(
    box.width / image.naturalWidth,
    box.height / image.naturalHeight,
  );

  const width = box.width / scale;
  const height = box.height / scale;

  ctx.drawImage(
    image,
    (image.naturalWidth - width) / 2,
    (image.naturalHeight - height) / 2,
    width,
    height,
    box.x,
    box.y,
    box.width,
    box.height,
  );
}

export class PvpIconDebugRunner {
  private matcher = new PvpIconMatcher();
  private segmentationWorker?: Worker;
  private students = new Map<string, IconDebugStudent>();
  private assets?: {
    template: HTMLImageElement;
    background: HTMLImageElement;
    cutouts: Cutout[];
    fillers: Record<IconDebugStudent["combatClass"], HTMLImageElement>;
  };

  async warmup(signal: AbortSignal, students: readonly IconDebugStudent[]) {
    this.students = new Map(students.map((student) => [student.id, student]));

    const filler = (
      combatClass: IconDebugStudent["combatClass"],
      preferred: string,
    ) => {
      const student =
        students.find(
          (item) => item.id === preferred && item.combatClass === combatClass,
        ) ?? students.find((item) => item.combatClass === combatClass);

      if (!student) {
        throw new Error(
          `No ${combatClass} student available to fill the template.`,
        );
      }

      return loadImage(buildStudentIconUrlFromId(student.id), signal);
    };

    const [report, background, main, support] = await Promise.all([
      loadImage(template.src, signal),
      loadImage(charBg.src, signal),
      filler("Main", "yuuka"),
      filler("Support", "hibiki"),
      this.matcher.warmup(),
    ]);

    signal.throwIfAborted();

    const canvas = document.createElement("canvas");
    canvas.width = report.naturalWidth;
    canvas.height = report.naturalHeight;

    const ctx = context(canvas);
    ctx.drawImage(report, 0, 0);

    const cutouts = findTemplateCutouts({
      width: canvas.width,
      height: canvas.height,
      pixels: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
    });

    this.assets = {
      template: report,
      background,
      cutouts,
      fillers: { Main: main, Support: support },
    };
  }

  async screenshot(studentId: string, signal: AbortSignal): Promise<File> {
    if (!this.assets) {
      throw new Error("Template is not loaded.");
    }

    const student = this.students.get(studentId);
    if (!student) {
      throw new Error(`Unknown student: ${studentId}`);
    }

    const slots = iconDebugSlotIndices(student.combatClass);
    const icon = await loadImage(buildStudentIconUrlFromId(studentId), signal);

    const canvas = document.createElement("canvas");
    canvas.width = this.assets.template.naturalWidth;
    canvas.height = this.assets.template.naturalHeight;

    const ctx = context(canvas);

    for (const [index, box] of this.assets.cutouts.entries()) {
      const slot = (index - 2) % 6;
      const portrait =
        index < 2 || slots.includes(slot)
          ? icon
          : this.assets.fillers[slot < 4 ? "Main" : "Support"];
      cover(ctx, this.assets.background, box);
      cover(ctx, portrait, box);
    }

    ctx.drawImage(this.assets.template, 0, 0);

    let blob: Blob;

    try {
      blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) =>
            value
              ? resolve(value)
              : reject(new Error("Failed to encode screenshot.")),
          "image/png",
        ),
      );
    } catch (cause) {
      throw new Error(
        `Unable to read composed screenshot. Check CDN CORS headers. ${cause instanceof Error ? cause.message : ""}`,
      );
    }

    signal.throwIfAborted();

    return new File([blob], `${studentId}.png`, { type: "image/png" });
  }

  async test(
    studentId: string,
    allowedIds: string[],
    signal: AbortSignal,
  ): Promise<IconDebugResult> {
    const rois = await getScreenshotROIs(
      await this.screenshot(studentId, signal),
    );

    signal.throwIfAborted();

    const prepared = await new Promise<PvpPreparedReport>((resolve, reject) => {
      const worker = new Worker(
        new URL("../../workers/pvp-ocr-image.ts", import.meta.url),
      );

      this.segmentationWorker = worker;

      const cleanup = () => {
        signal.removeEventListener("abort", cancel);
        worker.terminate();
        this.segmentationWorker = undefined;
      };

      const cancel = () => {
        cleanup();
        reject(new DOMException("Canceled", "AbortError"));
      };

      worker.onmessage = (
        event: MessageEvent<PvpWorkerResponse<PvpPreparedReport>>,
      ) => {
        cleanup();

        if (event.data.result) {
          resolve(event.data.result);
        } else {
          reject(new Error(event.data.error));
        }
      };

      worker.onerror = (event) => {
        cleanup();
        reject(new Error(event.message));
      };

      signal.addEventListener("abort", cancel, { once: true });
      worker.postMessage(rois);
    });

    signal.throwIfAborted();

    const anonymous = recognizePvpAnonymousOpponent(prepared.enemyStudentRep);

    const student = this.students.get(studentId);
    if (!student) {
      throw new Error(`Unknown student: ${studentId}`);
    }

    const slots = iconDebugSlotIndices(student.combatClass);

    const myUnits = prepared.myUnits.filter((unit) =>
      slots.includes(unit.sourceIndex),
    );

    const enemyUnits = prepared.enemyUnits.filter((unit) =>
      slots.includes(unit.sourceIndex),
    );

    const units = [...myUnits, ...enemyUnits];

    const matches = await this.matcher.match(
      [
        ...units.map((unit) => unit.icon),
        ...(anonymous ? [] : [prepared.enemyStudentRep]),
      ],
      allowedIds,
    );

    signal.throwIfAborted();

    const team = (
      side: typeof prepared.myUnits,
      matched: typeof prepared.myUnits,
      offset: number,
    ): IconDebugCase[] =>
      Array.from({ length: 6 }, (_, index) => {
        if (!slots.includes(index)) {
          return { skipped: true };
        }

        const unit = side.find((item) => item.sourceIndex === index);

        return unit
          ? {
              crop: unit.icon,
              match: matches[offset + matched.indexOf(unit)],
              error:
                side.length !== 6
                  ? `Segmentation found ${side.length} slots; expected 6.`
                  : undefined,
            }
          : { error: "Missing slot" };
      });

    return {
      studentId,
      representative: {
        crop: prepared.enemyStudentRep,
        match: anonymous ? undefined : matches[units.length],
        error: anonymous ? "Anonymous representative" : undefined,
      },
      myTeam: team(prepared.myUnits, myUnits, 0),
      opponentTeam: team(prepared.enemyUnits, enemyUnits, myUnits.length),
      error:
        !prepared.valid ||
        prepared.myUnits.length !== 6 ||
        prepared.enemyUnits.length !== 6
          ? `Segmentation: ${prepared.myUnits.length} own / ${prepared.enemyUnits.length} opponent slots; expected 6 each.`
          : undefined,
    };
  }

  dispose() {
    this.segmentationWorker?.terminate();
    this.matcher.dispose();
  }
}
