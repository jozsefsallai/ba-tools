"use client";

import {
  PvpCropPreview,
  PvpOcrReadings,
} from "@/app/[locale]/pvp/_components/pvp-screenshot-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useStudents } from "@/hooks/use-students";
import {
  type PvpExtractionResult,
  type PvpOcrProgress,
  resolvePvpReportTeam,
} from "@/lib/pvp";
import type { PvpOcrClient } from "@/lib/pvp/ocr";
import {
  getScreenshotModal,
  getScreenshotROIImages,
  getScreenshotROIs,
} from "@/lib/pvp/screenshot";
import {
  PVP_SCREENSHOT_INPUT_TYPES,
  PVP_SCREENSHOT_REGIONS,
  type PvpScreenshotRegion,
} from "@/lib/pvp/screenshot-types";
import { useEffect, useRef, useState } from "react";

type Preview = {
  name: PvpScreenshotRegion;
  url: string;
  size: number;
};

const REGION_LABELS: Record<PvpScreenshotRegion, string> = {
  enemyStudentRep: "Opponent representative",
  battleTypeAndResult: "Battle type and result",
  enemyName: "Enemy name",
  myUnits: "My units",
  enemyUnits: "Enemy units",
};

export function PvpScreenshotDebugger() {
  const [sourceUrl, setSourceUrl] = useState<string>();
  const [modalUrl, setModalUrl] = useState<string>();
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [dimensions, setDimensions] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File>();
  const [extraction, setExtraction] = useState<PvpExtractionResult>();
  const [ocrProgress, setOcrProgress] = useState<PvpOcrProgress>();

  const clientRef = useRef<PvpOcrClient | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const selectionRef = useRef(0);

  const { students } = useStudents();

  useEffect(
    () => () => {
      selectionRef.current++;
      abortRef.current?.abort();
      clientRef.current?.dispose();
    },
    [],
  );

  async function runOcr() {
    if (!selectedFile || abortRef.current) {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const selection = selectionRef.current;

    setError(undefined);
    setOcrProgress({ stage: "loading", progress: 0 });

    try {
      const { PvpOcrClient } = await import("@/lib/pvp/ocr");

      if (controller.signal.aborted) {
        return;
      }

      clientRef.current ??= new PvpOcrClient();

      const rois = await getScreenshotROIs(selectedFile);

      if (controller.signal.aborted) {
        return;
      }

      const result = await clientRef.current.extract(rois, {
        signal: controller.signal,
        students,
        onProgress: (progress) => {
          if (
            !controller.signal.aborted &&
            selection === selectionRef.current
          ) {
            setOcrProgress(progress);
          }
        },
      });

      if (!controller.signal.aborted && selection === selectionRef.current) {
        setExtraction(result);
      }
    } catch (cause) {
      if (!controller.signal.aborted && selection === selectionRef.current) {
        setError(cause instanceof Error ? cause.message : "OCR failed");
      }
    } finally {
      if (selection === selectionRef.current) {
        abortRef.current = undefined;
        setOcrProgress(undefined);
      }
    }
  }

  useEffect(() => {
    if (!sourceUrl) {
      return;
    }

    return () => URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  useEffect(() => {
    if (!modalUrl) {
      return;
    }

    return () => URL.revokeObjectURL(modalUrl);
  }, [modalUrl]);

  useEffect(() => {
    return () => {
      for (const preview of previews) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [previews]);

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }

    const selection = ++selectionRef.current;
    abortRef.current?.abort();
    abortRef.current = undefined;

    setOcrProgress(undefined);
    setExtraction(undefined);
    setSelectedFile(file);
    setLoading(true);
    setError(undefined);
    setPreviews([]);
    setModalUrl(undefined);

    const nextSourceUrl = URL.createObjectURL(file);
    setSourceUrl(nextSourceUrl);

    try {
      const image = await getImageDimensions(nextSourceUrl);

      if (selection !== selectionRef.current) {
        return;
      }

      setDimensions(`${image.width} × ${image.height}`);

      const regions = await getScreenshotROIImages(file);
      const modal = await getScreenshotModal(file);

      if (selection !== selectionRef.current) {
        return;
      }

      setModalUrl(URL.createObjectURL(modal));
      setPreviews(
        PVP_SCREENSHOT_REGIONS.map((name) => ({
          name,
          size: regions[name].size,
          url: URL.createObjectURL(regions[name]),
        })),
      );
    } catch (cause) {
      if (selection !== selectionRef.current) {
        return;
      }

      setError(
        cause instanceof Error ? cause.message : "Failed to extract ROIs",
      );

      URL.revokeObjectURL(nextSourceUrl);

      setSourceUrl(undefined);
      setDimensions(undefined);
    } finally {
      if (selection === selectionRef.current) {
        setLoading(false);
      }
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">DEBUG PAGE</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          PVP screenshot ROIs
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Choose a combat report to inspect the modal crop, resize, and four
          image regions, then run local OCR to inspect its readings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source screenshot</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <Input
            type="file"
            accept={PVP_SCREENSHOT_INPUT_TYPES.join(",")}
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />

          {loading && (
            <p className="text-sm text-muted-foreground">Extracting regions…</p>
          )}

          {dimensions && (
            <p className="text-sm text-muted-foreground">Input: {dimensions}</p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {sourceUrl && (
            <img
              src={sourceUrl}
              alt="Uploaded PvP combat report"
              className="max-h-[55vh] w-full rounded-md border object-contain"
            />
          )}

          {modalUrl && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Cropped and resized modal</p>

              <img
                src={modalUrl}
                alt="Cropped and resized PvP combat report modal"
                className="max-h-[55vh] w-full rounded-md border object-contain"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {previews.length > 0 && (
        <section className="grid gap-5 md:grid-cols-2">
          {previews.map((preview) => (
            <Card key={preview.name}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {REGION_LABELS[preview.name]}
                </CardTitle>

                <p className="font-mono text-xs text-muted-foreground">
                  {preview.name} · {(preview.size / 1024).toFixed(1)} KiB JPEG
                </p>
              </CardHeader>

              <CardContent>
                <div className="flex min-h-32 items-center justify-center overflow-hidden rounded-md bg-muted/40 p-2">
                  <img
                    src={preview.url}
                    alt={`${REGION_LABELS[preview.name]} ROI`}
                    className="max-h-72 max-w-full object-contain"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {selectedFile && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Local recognition</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void runOcr()}
                disabled={!!ocrProgress}
              >
                Run local extraction
              </Button>

              {ocrProgress && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    abortRef.current?.abort();
                    setOcrProgress(undefined);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>

            {ocrProgress && (
              <div aria-live="polite" className="flex flex-col gap-2">
                <p>
                  {ocrProgress.stage === "loading"
                    ? "Loading recognition assets…"
                    : "Recognizing report…"}
                </p>

                <Progress value={ocrProgress.progress * 100} />
              </div>
            )}

            {extraction && (
              <p>
                Valid: {String(extraction.valid)} ·{" "}
                {(extraction.elapsedMs / 1000).toFixed(2)} s
              </p>
            )}

            {extraction?.battle && (
              <>
                {extraction.battle.enemyNameRecognition && (
                  <pre className="whitespace-pre-wrap break-all text-xs">
                    {JSON.stringify(
                      {
                        ...extraction.battle.enemyNameRecognition,
                        receipt: undefined,
                      },
                      null,
                      2,
                    )}
                  </pre>
                )}
                {[
                  extraction.battle.battleType,
                  extraction.battle.result,
                  extraction.battle.enemyName,
                  extraction.battle.enemyStudentRep,
                ].map((field, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <p>
                      {
                        [
                          "Battle type",
                          "Result",
                          "Opponent name",
                          "Opponent representative",
                        ][index]
                      }
                      :{" "}
                      {field.value ??
                        (index >= 2 &&
                        extraction.battle?.enemyNameStatus === "anonymous"
                          ? "anonymous"
                          : "unreadable")}{" "}
                      · {field.confidence.toFixed(1)} · uncertain:{" "}
                      {String(field.uncertain)}
                    </p>

                    {field.crop && <PvpCropPreview image={field.crop} />}

                    <pre className="whitespace-pre-wrap break-words text-xs">
                      {field.rawText}
                    </pre>

                    <PvpOcrReadings readings={field.alternatives} />

                    {index === 3 &&
                      extraction.battle?.enemyStudentRep.iconMatch.candidates.map(
                        (candidate) => (
                          <p key={candidate.studentId} className="text-xs">
                            {students.find(
                              (student) => student.id === candidate.studentId,
                            )?.name ?? candidate.studentId}
                            {" · distance: "}
                            {candidate.distance.toFixed(2)}
                          </p>
                        ),
                      )}
                  </div>
                ))}

                {(["myUnits", "enemyUnits"] as const).map((side) => {
                  const units = extraction.battle?.[side] ?? [];
                  const resolved = resolvePvpReportTeam(units, students);

                  return (
                    <div key={side} className="flex flex-col gap-4">
                      <h2>{REGION_LABELS[side]}</h2>

                      {units.map((unit) => (
                        <div
                          key={unit.sourceIndex}
                          className="flex flex-col gap-2 rounded-md border p-3"
                        >
                          <p>
                            Column {unit.sourceIndex + 1} ·{" "}
                            {unit.combatClass ?? "unknown class"}
                          </p>

                          {(["student", "damage"] as const).map((key) => {
                            const field =
                              key === "student"
                                ? (resolved.find(
                                    (item) =>
                                      item.report?.student.crop ===
                                      unit.student.crop,
                                  )?.report?.student ?? unit.student)
                                : unit.damage;

                            return (
                              <div key={key} className="flex flex-col gap-1">
                                {field.crop && (
                                  <PvpCropPreview image={field.crop} />
                                )}

                                <p className="text-sm">
                                  {key}: {field.value ?? "unreadable"} ·{" "}
                                  {field.confidence.toFixed(1)}
                                </p>

                                <pre className="whitespace-pre-wrap break-words text-xs">
                                  {field.rawText}
                                </pre>

                                <PvpOcrReadings readings={field.alternatives} />
                              </div>
                            );
                          })}

                          {unit.student.iconMatch && (
                            <div className="text-xs">
                              <p>
                                Icon similarity:{" "}
                                {unit.student.iconMatch.confidence.toFixed(1)} ·
                                separation:{" "}
                                {(unit.student.iconMatch.margin * 100).toFixed(
                                  1,
                                )}
                                % · uncertain:{" "}
                                {String(unit.student.iconMatch.uncertain)}
                              </p>

                              <ul>
                                {unit.student.iconMatch.candidates.map(
                                  (candidate) => (
                                    <li key={candidate.studentId}>
                                      {students.find(
                                        (student) =>
                                          student.id === candidate.studentId,
                                      )?.name ?? candidate.studentId}{" "}
                                      · distance:{" "}
                                      {candidate.distance.toFixed(2)}
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}

                          <p className="text-xs">
                            Student candidates:{" "}
                            {resolved
                              .find(
                                (item) =>
                                  item.report?.student.crop ===
                                  unit.student.crop,
                              )
                              ?.report?.candidateIds.map(
                                (id) =>
                                  students.find((student) => student.id === id)
                                    ?.name ?? id,
                              )
                              .join(" · ") || "none"}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function getImageDimensions(
  url: string,
): Promise<{ height: number; width: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({ height: image.naturalHeight, width: image.naturalWidth });
    image.onerror = () => reject(new Error("Unable to read image dimensions"));
    image.src = url;
  });
}
