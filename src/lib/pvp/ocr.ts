import {
  PVP_OCR_CONFIDENCE_THRESHOLD,
  type PvpExtractedUnit,
  type PvpExtractionResult,
  type PvpOcrField,
  type PvpOcrMode,
  type PvpOcrProgress,
  type PvpOcrReading,
  type PvpPixelImage,
  type PvpStudentField,
  type PvpStudentIdentity,
  getPvpEnemyNameStatus,
  parsePvpDamage,
  parsePvpOpponentName,
  parsePvpResult,
  selectPvpOpponentReading,
} from "@/lib/pvp";
import { recognizePvpAnonymousOpponent } from "@/lib/pvp/anonymous-icon";
import { drawPvpCrop } from "@/lib/pvp/canvas";
import { PvpIconMatcher } from "@/lib/pvp/icon-matcher";
import assets from "@/lib/pvp/ocr-assets.json";
import { type PvpPreparedReport, preprocessPvpText } from "@/lib/pvp/ocr-image";
import type { PVPScreenshotROIs } from "@/lib/pvp/screenshot-types";
import type { PvpWorkerResponse } from "@/lib/pvp/worker-types";
import { OEM, type Worker as OcrWorker, PSM, createWorker } from "tesseract.js";

const CONFIG = {
  load_system_dawg: "0",
  load_freq_dawg: "0",
  load_number_dawg: "0",
  load_punc_dawg: "0",
  load_bigram_dawg: "0",
  load_unambig_dawg: "0",
};

function aborted() {
  return new DOMException("Screenshot import canceled", "AbortError");
}

function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(aborted());
  }

  return new Promise((resolve, reject) => {
    const cancel = () => reject(aborted());

    signal.addEventListener("abort", cancel, { once: true });

    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", cancel));
  });
}

function prepare(
  rois: PVPScreenshotROIs,
  signal: AbortSignal,
): Promise<PvpPreparedReport> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../../workers/pvp-ocr-image.ts", import.meta.url),
    );

    const finish = () => {
      signal.removeEventListener("abort", cancel);
      worker.terminate();
    };

    const cancel = () => {
      finish();
      reject(aborted());
    };

    worker.onmessage = (
      event: MessageEvent<PvpWorkerResponse<PvpPreparedReport>>,
    ) => {
      finish();

      if (event.data.result) {
        resolve(event.data.result);
      } else {
        reject(new Error(event.data.error ?? "Unable to segment screenshot"));
      }
    };

    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message));
    };

    signal.addEventListener("abort", cancel, { once: true });

    if (signal.aborted) {
      cancel();
      return;
    }

    worker.postMessage(
      rois,
      Object.values(rois).map((pixels) => pixels.buffer as ArrayBuffer),
    );
  });
}

export class PvpOcrClient {
  private worker: OcrWorker | null = null;
  private icons = new PvpIconMatcher();
  private loading: Promise<OcrWorker> | null = null;
  private generation = 0;
  private busy = false;
  private listener?: (progress: PvpOcrProgress) => void;

  async warmup(onProgress?: (progress: PvpOcrProgress) => void) {
    this.listener = onProgress;

    if (!this.loading) {
      const generation = this.generation;
      const base = new URL(`/ocr/${assets.version}/`, window.location.origin)
        .href;

      let rejectLoad: (error: Error) => void = () => {};
      const failure = new Promise<never>((_, reject) => {
        rejectLoad = reject;
      });

      const initialization = createWorker(
        "eng",
        OEM.LSTM_ONLY,
        {
          workerPath: `${base}worker.min.js`,
          corePath: `${base}core`,
          langPath: `${base}lang`,
          cachePath: assets.version,
          workerBlobURL: false,
          logger: (message) => {
            if (/loading/.test(message.status)) {
              this.listener?.({ stage: "loading", progress: message.progress });
            }
          },
          errorHandler: (error: unknown) => {
            return rejectLoad(new Error(String(error)));
          },
        },
        CONFIG,
      );

      this.loading = Promise.race([initialization, failure])
        .then(async (worker) => {
          if (generation !== this.generation) {
            await worker.terminate();
            throw aborted();
          }

          this.worker = worker;
          return worker;
        })
        .catch((error) => {
          if (generation === this.generation) {
            this.loading = null;
          }

          throw error;
        });
    }

    await Promise.all([this.loading, this.icons.warmup(onProgress)]);
    onProgress?.({ stage: "ready", progress: 1 });
  }

  dispose() {
    this.generation++;
    this.listener = undefined;
    this.icons.dispose();
    void this.worker?.terminate();
    this.worker = null;
    this.loading = null;
    this.busy = false;
  }

  async extract(
    rois: PVPScreenshotROIs,
    options: {
      signal: AbortSignal;
      onProgress?: (progress: PvpOcrProgress) => void;
      students?: readonly PvpStudentIdentity[];
    },
  ): Promise<PvpExtractionResult> {
    if (this.busy) {
      throw new Error("Screenshot extraction is already running");
    }

    const { signal, onProgress } = options;

    let language = "eng";

    const started = performance.now();

    const generation = this.generation;

    this.busy = true;

    const cancel = () => this.dispose();

    signal.addEventListener("abort", cancel, { once: true });

    try {
      const prepared = await prepare(rois, signal);

      if (!prepared.valid) {
        return {
          valid: false,
          battle: null,
          elapsedMs: performance.now() - started,
        };
      }

      await withAbort(this.warmup(onProgress), signal);

      const worker = this.worker;
      if (!worker) {
        throw aborted();
      }

      this.listener = onProgress;
      await withAbort(
        worker.reinitialize("eng", OEM.LSTM_ONLY, CONFIG),
        signal,
      );

      let completed = 0;

      const total =
        3 + (prepared.myUnits.length + prepared.enemyUnits.length) * 2;

      const progress = () =>
        onProgress?.({ stage: "recognizing", progress: ++completed / total });

      const initializeLanguage = async (locale: string) => {
        language = locale;

        await withAbort(
          worker.reinitialize(locale, OEM.LSTM_ONLY, CONFIG),
          signal,
        );

        onProgress?.({ stage: "recognizing", progress: completed / total });
      };

      const recognize = async <T>(
        crop: PvpPixelImage | null,
        mode: PvpOcrMode,
        parse: (text: string) => T | null,
        countProgress = true,
      ): Promise<PvpOcrField<T>> => {
        if (!crop) {
          if (countProgress) {
            progress();
          }

          return {
            value: null,
            rawText: "",
            confidence: 0,
            uncertain: true,
            crop: null,
          };
        }

        await withAbort(
          worker.setParameters({
            tessedit_pageseg_mode: PSM.SINGLE_LINE,
            tessedit_char_whitelist:
              mode === "digits"
                ? "0123456789"
                : mode === "result"
                  ? "WINLOSEwinlose"
                  : "",
            tessedit_char_blacklist: "",
            preserve_interword_spaces: "1",
            user_defined_dpi: "300",
          }),
          signal,
        );

        let best: PvpOcrField<T> | null = null;

        const readings: PvpOcrReading[] = [];

        const attempts =
          mode === "text"
            ? [
                { threshold: false, scale: 3, deslant: 0 },
                { threshold: false, scale: 4, deslant: 0 },
                { threshold: true, scale: 3, deslant: 0 },
              ]
            : [
                {
                  threshold: false,
                  scale: mode === "result" ? 2 : 3,
                  deslant: 0,
                },
                {
                  threshold: true,
                  scale: mode === "result" ? 2 : 3,
                  deslant: 0,
                },
              ];

        if (mode === "result") {
          attempts.push({ threshold: false, scale: 3, deslant: 0.22 });
          attempts.push({ threshold: true, scale: 3, deslant: 0.22 });
        }

        if (mode === "digits" && crop.width < crop.height * 1.5) {
          attempts.push({ threshold: false, scale: 4, deslant: 0 });
        }

        for (const [
          attempt,
          { threshold, scale, deslant },
        ] of attempts.entries()) {
          if (mode === "digits" && attempt === 2) {
            await withAbort(
              worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_CHAR }),
              signal,
            );
          }

          if (mode === "result" && attempt >= 2) {
            await withAbort(
              worker.setParameters({ tessedit_pageseg_mode: PSM.RAW_LINE }),
              signal,
            );
          }

          const canvas = document.createElement("canvas");

          drawPvpCrop(
            canvas,
            preprocessPvpText(crop, mode, threshold),
            scale,
            12,
            deslant,
          );

          const { data } = await withAbort(worker.recognize(canvas), signal);

          const value = parse(data.text);

          readings.push({
            rawText: data.text.trim(),
            confidence: data.confidence,
            language,
            preprocessing: `${threshold ? "threshold" : "grayscale"} ${scale}x${deslant ? " upright" : ""}`,
          });

          const field = {
            value,
            rawText: data.text.trim(),
            confidence: data.confidence,
            uncertain:
              value == null ||
              data.confidence < PVP_OCR_CONFIDENCE_THRESHOLD ||
              (mode === "result" &&
                !/^(win|lose)$/i.test(data.text.replace(/\s/g, ""))),
            crop,
          };

          if (
            !best ||
            (value != null && best.value == null) ||
            ((value != null) === (best.value != null) &&
              field.confidence > best.confidence)
          ) {
            best = field;
          }

          if (
            best.value != null &&
            !best.uncertain &&
            (mode !== "text" || attempt >= 1)
          ) {
            break;
          }
        }

        if (countProgress) {
          progress();
        }

        return {
          ...best,
          alternatives:
            mode === "text" || mode === "result" ? readings : undefined,
        } as PvpOcrField<T>;
      };

      const result = await recognize(prepared.result, "result", parsePvpResult);
      const unitCrops = [...prepared.myUnits, ...prepared.enemyUnits];
      const anonymousRep = recognizePvpAnonymousOpponent(
        prepared.enemyStudentRep,
      );

      const iconCrops = [
        ...unitCrops.map((unit) => unit.icon),
        ...(anonymousRep ? [] : [prepared.enemyStudentRep]),
      ];

      const matches = await withAbort(
        this.icons.match(
          iconCrops,
          options.students?.map((student) => student.id),
        ),
        signal,
      );

      const catalog = new Map(
        options.students?.map((student) => [student.id, student.name]),
      );

      const studentField = (index: number): PvpStudentField => {
        const match = matches[index];

        if (!match) {
          throw new Error("Incomplete student icon matches");
        }

        const name =
          match.studentId &&
          (catalog.get(match.studentId) ??
            this.icons.studentName(match.studentId));

        progress();

        return {
          value: name || null,
          rawText: "",
          confidence: match.confidence,
          uncertain: match.uncertain,
          crop: iconCrops[index],
          iconMatch: match,
        };
      };

      const units: PvpExtractedUnit[] = [];

      for (const [index, unit] of unitCrops.entries()) {
        units.push({
          sourceIndex: unit.sourceIndex,
          combatClass: unit.combatClass,
          student: studentField(index),
          damage: await recognize(unit.damage, "digits", parsePvpDamage),
        });
      }

      const myUnits = units.slice(0, prepared.myUnits.length);
      const enemyUnits = units.slice(prepared.myUnits.length);
      const enemyStudentRep = anonymousRep ?? studentField(unitCrops.length);

      if (anonymousRep) {
        progress();
      }

      const opponentReadings: PvpOcrField<string>[] = [];
      for (const locale of anonymousRep ? [] : assets.languages) {
        await initializeLanguage(locale);

        opponentReadings.push(
          await recognize(
            prepared.enemyName,
            "text",
            parsePvpOpponentName,
            false,
          ),
        );
      }

      const enemyName: PvpOcrField<string> = anonymousRep
        ? {
            value: null,
            rawText: "",
            confidence: anonymousRep.confidence,
            uncertain: false,
            crop: prepared.enemyName,
          }
        : selectPvpOpponentReading(opponentReadings);

      progress();

      const enemyNameStatus = getPvpEnemyNameStatus(
        enemyName,
        anonymousRep != null,
      );

      signal.throwIfAborted();

      return {
        valid: true,
        battle: {
          battleType: prepared.battleType,
          result,
          enemyName,
          enemyNameStatus,
          enemyStudentRep,
          myUnits,
          enemyUnits,
        },
        elapsedMs: performance.now() - started,
      };
    } catch (error) {
      if (generation === this.generation) {
        this.dispose();
      }

      throw error;
    } finally {
      signal.removeEventListener("abort", cancel);

      if (generation === this.generation) {
        this.busy = false;
        this.listener = undefined;
      }
    }
  }
}
