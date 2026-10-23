"use client";

import {
  PvpCropPreview,
  PvpOcrReadings,
} from "@/app/[locale]/pvp/_components/pvp-screenshot-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useStudents } from "@/hooks/use-students";
import { Link } from "@/i18n/navigation";
import {
  type PvpExtractionResult,
  type PvpOcrField,
  type PvpOcrProgress,
  resolvePvpReportTeam,
} from "@/lib/pvp";
import {
  type PvpDebugFieldStatus,
  type PvpDebugIssue,
  collectPvpDebugIssues,
  getPvpDebugFieldStatus,
  getPvpDebugStudentReasons,
  getPvpDebugUnitId,
} from "@/lib/pvp/debug-issues";
import type { PvpOcrClient } from "@/lib/pvp/ocr";
import { getScreenshotPreview, getScreenshotROIs } from "@/lib/pvp/screenshot";
import {
  type PvpAlignmentDiagnostics,
  PvpScreenshotAlignmentError,
} from "@/lib/pvp/screenshot-layout";
import {
  PVP_SCREENSHOT_INPUT_TYPES,
  PVP_SCREENSHOT_REGIONS,
  type PvpScreenshotRegion,
} from "@/lib/pvp/screenshot-types";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const [overlayUrl, setOverlayUrl] = useState<string>();
  const [diagnostics, setDiagnostics] = useState<PvpAlignmentDiagnostics>();
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

  const studentName = (id: string) =>
    students.find((student) => student.id === id)?.name ?? id;

  const issues = useMemo(
    () => extraction && collectPvpDebugIssues(extraction, students),
    [extraction, students],
  );

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

  useEffect(() => {
    return () => {
      if (overlayUrl) {
        URL.revokeObjectURL(overlayUrl);
      }
    };
  }, [overlayUrl]);

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
    setOverlayUrl(undefined);
    setDiagnostics(undefined);

    const nextSourceUrl = URL.createObjectURL(file);
    setSourceUrl(nextSourceUrl);

    try {
      const image = await getImageDimensions(nextSourceUrl);

      if (selection !== selectionRef.current) {
        return;
      }

      setDimensions(`${image.width} × ${image.height}`);

      const preview = await getScreenshotPreview(file);

      if (selection !== selectionRef.current) {
        return;
      }

      setModalUrl(URL.createObjectURL(preview.report));
      setOverlayUrl(URL.createObjectURL(preview.overlay));
      setDiagnostics({
        ...preview.diagnostics,
        candidates: [preview.alignment, ...preview.diagnostics.candidates],
      });
      setPreviews(
        PVP_SCREENSHOT_REGIONS.map((name) => ({
          name,
          size: preview.regions[name].size,
          url: URL.createObjectURL(preview.regions[name]),
        })),
      );
    } catch (cause) {
      if (selection !== selectionRef.current) {
        return;
      }

      setError(
        cause instanceof Error ? cause.message : "Failed to extract ROIs",
      );

      if (cause instanceof PvpScreenshotAlignmentError) {
        setDiagnostics(cause.diagnostics);
      }

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
          Choose a combat report to inspect alignment and the five image
          regions, then run local OCR to inspect its readings.
        </p>

        <Link href="/pvp/icon-debug" className="underline">
          Test every student icon on synthetic screenshots
        </Link>
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

          {overlayUrl && (
            <img
              src={overlayUrl}
              alt="Detected source chart rules"
              className="max-h-[55vh] w-full rounded-md border object-contain"
            />
          )}

          {diagnostics && <AlignmentSummary diagnostics={diagnostics} />}

          {diagnostics && (
            <details>
              <summary>Alignment diagnostics</summary>
              <pre className="overflow-auto text-xs">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            </details>
          )}
          {modalUrl && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Normalized report</p>

              <img
                src={modalUrl}
                alt="Normalized PvP combat report"
                className="max-h-[55vh] w-full rounded-md border object-contain"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {previews.length > 0 && (
        <section
          id="debug-regions"
          className="grid scroll-mt-4 gap-5 md:grid-cols-2"
        >
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

            {extraction && issues && (
              <IssueSummary issues={issues} elapsedMs={extraction.elapsedMs} />
            )}

            {extraction?.battle && (
              <>
                {(
                  [
                    [
                      "debug-battle-type",
                      "Battle type",
                      extraction.battle.battleType,
                    ],
                    ["debug-result", "Result", extraction.battle.result],
                  ] as const
                ).map(([id, label, field]) => (
                  <FieldPanel key={id} id={id} label={label} field={field}>
                    <pre className="whitespace-pre-wrap break-words text-xs">
                      {field.rawText}
                    </pre>
                  </FieldPanel>
                ))}

                <FieldPanel
                  id="debug-opponent-name"
                  label="Opponent name"
                  field={extraction.battle.enemyName}
                  status={
                    extraction.battle.enemyNameStatus === "anonymous"
                      ? "ok"
                      : undefined
                  }
                  value={
                    extraction.battle.enemyNameStatus === "anonymous"
                      ? "anonymous"
                      : undefined
                  }
                >
                  <pre className="whitespace-pre-wrap break-words text-xs">
                    {extraction.battle.enemyName.rawText}
                  </pre>

                  <PvpOcrReadings
                    readings={extraction.battle.enemyName.alternatives}
                  />

                  {extraction.battle.enemyNameRecognition && (
                    <details className="text-xs">
                      <summary className="cursor-pointer">
                        Name recognition details
                      </summary>
                      <pre className="whitespace-pre-wrap break-all">
                        {JSON.stringify(
                          {
                            ...extraction.battle.enemyNameRecognition,
                            receipt: undefined,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  )}
                </FieldPanel>

                <FieldPanel
                  id="debug-opponent-representative"
                  label="Opponent representative"
                  field={extraction.battle.enemyStudentRep}
                  status={
                    extraction.battle.enemyNameStatus === "anonymous"
                      ? "ok"
                      : undefined
                  }
                  value={
                    extraction.battle.enemyNameStatus === "anonymous"
                      ? "anonymous"
                      : undefined
                  }
                >
                  <CandidateList
                    candidates={
                      extraction.battle.enemyStudentRep.iconMatch.candidates
                    }
                    studentName={studentName}
                  />
                </FieldPanel>

                {(["myUnits", "enemyUnits"] as const).map((side) => {
                  const units = extraction.battle?.[side] ?? [];
                  const resolved = resolvePvpReportTeam(units, students);

                  return (
                    <section
                      key={side}
                      id={`debug-${side}`}
                      className="flex scroll-mt-4 flex-col gap-3"
                    >
                      <h2 className="text-lg font-semibold">
                        {REGION_LABELS[side]}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {units.length} column(s) detected
                        </span>
                      </h2>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {units.map((unit) => {
                          const report = resolved.find(
                            (item) =>
                              item.report?.student.crop === unit.student.crop,
                          )?.report;
                          const student = report?.student ?? unit.student;
                          const reasons = getPvpDebugStudentReasons(
                            unit,
                            students,
                          );
                          const status = worstStatus([
                            getPvpDebugFieldStatus(student),
                            getPvpDebugFieldStatus(unit.damage),
                          ]);

                          return (
                            <div
                              key={unit.sourceIndex}
                              id={getPvpDebugUnitId(side, unit)}
                              className={cn(
                                "flex scroll-mt-4 flex-col gap-2 rounded-md border p-3",
                                STATUS_BORDERS[status],
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium">
                                  Column {unit.sourceIndex + 1}
                                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                                    {unit.combatClass ?? "unknown class"}
                                  </span>
                                </p>

                                <StatusBadge status={status} />
                              </div>

                              <div className="flex flex-wrap items-start gap-3">
                                {student.crop && (
                                  <PvpCropPreview image={student.crop} />
                                )}
                                {unit.damage.crop && (
                                  <PvpCropPreview image={unit.damage.crop} />
                                )}
                              </div>

                              <FieldLine
                                label="Student"
                                field={student}
                                detail={`similarity ${unit.student.iconMatch.confidence.toFixed(1)} · separation ${(unit.student.iconMatch.margin * 100).toFixed(1)}%`}
                              />

                              {reasons.length > 0 && (
                                <ul className="list-disc pl-5 text-xs text-muted-foreground">
                                  {reasons.map((reason) => (
                                    <li key={reason}>{reason}</li>
                                  ))}
                                </ul>
                              )}

                              <FieldLine
                                label="Damage"
                                field={unit.damage}
                                detail={
                                  unit.damage.crop
                                    ? `OCR "${unit.damage.rawText}" · ${unit.damage.confidence.toFixed(1)}`
                                    : "no badge found"
                                }
                              />

                              <PvpOcrReadings
                                readings={unit.damage.alternatives}
                              />

                              <details className="text-xs">
                                <summary className="cursor-pointer">
                                  Icon candidates
                                </summary>

                                <CandidateList
                                  candidates={unit.student.iconMatch.candidates}
                                  studentName={studentName}
                                />

                                <p className="mt-1 text-muted-foreground">
                                  Suggested:{" "}
                                  {report?.candidateIds
                                    .map(studentName)
                                    .join(" · ") || "none"}
                                </p>
                              </details>
                            </div>
                          );
                        })}
                      </div>
                    </section>
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

const STATUS_BORDERS: Record<PvpDebugFieldStatus, string> = {
  ok: "",
  uncertain: "border-amber-500/70 bg-amber-500/5",
  missing: "border-destructive/70 bg-destructive/5",
};

function worstStatus(statuses: PvpDebugFieldStatus[]): PvpDebugFieldStatus {
  if (statuses.includes("missing")) {
    return "missing";
  }

  return statuses.includes("uncertain") ? "uncertain" : "ok";
}

function StatusBadge({ status }: { status: PvpDebugFieldStatus }) {
  if (status === "missing") {
    return <Badge variant="destructive">Missing</Badge>;
  }

  if (status === "uncertain") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/70 text-amber-600 dark:text-amber-400"
      >
        Uncertain
      </Badge>
    );
  }

  return <Badge variant="secondary">OK</Badge>;
}

function FieldLine({
  label,
  field,
  detail,
}: {
  label: string;
  field: PvpOcrField<unknown>;
  detail?: string;
}) {
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}:</span>{" "}
      <span className="font-medium">
        {field.value == null ? "—" : String(field.value)}
      </span>
      {detail && (
        <span className="text-xs text-muted-foreground"> · {detail}</span>
      )}
    </p>
  );
}

function FieldPanel({
  id,
  label,
  field,
  status = getPvpDebugFieldStatus(field),
  value,
  children,
}: {
  id: string;
  label: string;
  field: PvpOcrField<unknown>;
  status?: PvpDebugFieldStatus;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div
      id={id}
      className={cn(
        "flex scroll-mt-4 flex-col gap-2 rounded-md border p-3",
        STATUS_BORDERS[status],
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          <span className="text-muted-foreground">{label}:</span>{" "}
          <span className="font-medium">
            {value ?? (field.value == null ? "—" : String(field.value))}
          </span>
          <span className="text-xs text-muted-foreground">
            {" "}
            · confidence {field.confidence.toFixed(1)}
          </span>
        </p>

        <StatusBadge status={status} />
      </div>

      {field.crop && <PvpCropPreview image={field.crop} />}

      {children}
    </div>
  );
}

function CandidateList({
  candidates,
  studentName,
}: {
  candidates: { studentId: string; distance: number }[];
  studentName: (id: string) => string;
}) {
  if (!candidates.length) {
    return <p className="text-xs text-muted-foreground">No candidates</p>;
  }

  return (
    <ol className="list-decimal pl-5 text-xs">
      {candidates.map((candidate) => (
        <li key={candidate.studentId}>
          {studentName(candidate.studentId)}
          <span className="text-muted-foreground">
            {" "}
            · distance {candidate.distance.toFixed(2)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function IssueSummary({
  issues,
  elapsedMs,
}: {
  issues: PvpDebugIssue[];
  elapsedMs: number;
}) {
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.length - errors;
  const blocking = issues.some((issue) => issue.blocking);

  const [verdict, tone] = blocking
    ? ["Bulk import would reject this screenshot", "missing" as const]
    : errors
      ? ["Imports, but with missing data", "missing" as const]
      : warnings
        ? ["Imports, but review the uncertain fields", "uncertain" as const]
        : ["No issues detected", "ok" as const];

  return (
    <section
      aria-labelledby="debug-issues-heading"
      className={cn(
        "flex flex-col gap-3 rounded-md border p-4",
        STATUS_BORDERS[tone],
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="debug-issues-heading" className="font-semibold">
          {verdict}
        </h2>

        {errors > 0 && (
          <Badge variant="destructive">
            {errors} error{errors === 1 ? "" : "s"}
          </Badge>
        )}

        {warnings > 0 && <WarningCountBadge count={warnings} />}

        <span className="ml-auto text-xs text-muted-foreground">
          {(elapsedMs / 1000).toFixed(2)} s
        </span>
      </div>

      {issues.length > 0 && (
        <ul className="flex flex-col gap-2">
          {issues.map((issue, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <StatusBadge
                status={issue.severity === "error" ? "missing" : "uncertain"}
              />

              <div className="min-w-0">
                <a href={`#${issue.target}`} className="hover:underline">
                  {issue.title}
                  {issue.blocking && (
                    <span className="font-semibold"> (blocks import)</span>
                  )}
                </a>

                {issue.detail && (
                  <p className="break-words text-xs text-muted-foreground">
                    {issue.detail}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WarningCountBadge({ count }: { count: number }) {
  return (
    <Badge
      variant="outline"
      className="border-amber-500/70 text-amber-600 dark:text-amber-400"
    >
      {count} warning{count === 1 ? "" : "s"}
    </Badge>
  );
}

function AlignmentSummary({
  diagnostics,
}: {
  diagnostics: PvpAlignmentDiagnostics;
}) {
  if (diagnostics.rejection) {
    return (
      <p className="rounded-md border border-destructive/70 bg-destructive/5 p-3 text-sm">
        <span className="font-semibold">Alignment failed:</span>{" "}
        {diagnostics.rejection}
        <span className="block text-xs text-muted-foreground">
          {diagnostics.rules.length} horizontal rule(s) found,{" "}
          {diagnostics.candidates.length} layout candidate(s)
        </span>
      </p>
    );
  }

  const [chosen] = diagnostics.candidates;

  if (!chosen) {
    return null;
  }

  return (
    <p className="text-sm text-muted-foreground">
      Aligned · {chosen.scale.toFixed(3)} source px per report px · score{" "}
      {chosen.score.toFixed(2)} · {diagnostics.rules.length} rule(s) found
    </p>
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
