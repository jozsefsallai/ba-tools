"use client";

import { PvpCropPreview } from "@/app/[locale]/pvp/_components/pvp-screenshot-preview";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStudents } from "@/hooks/use-students";
import { Link } from "@/i18n/navigation";
import { drawPvpPixels } from "@/lib/pvp/canvas";
import type { PvpIconDebugRunner } from "@/lib/pvp/icon-debug";
import { runIconDebugPool } from "@/lib/pvp/icon-debug-pool";
import {
  type IconDebugCase,
  type IconDebugResult,
  failedIconDebugResult,
  iconDebugCases,
  iconDebugCorrect,
} from "@/lib/pvp/icon-debug-results";
import { buildStudentIconUrlFromId } from "@/lib/url";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";

const PAGE_SIZE = 25;

export function PvpIconDebugger() {
  const { students, studentMap } = useStudents();

  const [rows, setRows] = useState<IconDebugResult[]>([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState<string>();
  const [incorrectOnly, setIncorrectOnly] = useState(false);
  const [page, setPage] = useState(0);

  const runnerRef = useRef<PvpIconDebugRunner | undefined>(undefined);
  const runnersRef = useRef<PvpIconDebugRunner[]>([]);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const generationRef = useRef(0);

  useEffect(
    () => () => {
      generationRef.current++;
      abortRef.current?.abort();

      for (const runner of runnersRef.current) {
        runner.dispose();
      }
    },
    [],
  );

  const summary = useMemo(() => {
    let total = 0;
    let correct = 0;
    let uncertain = 0;
    let incorrectRows = 0;

    for (const row of rows) {
      const cases = iconDebugCases(row);
      total += cases.length;

      if (
        row.error ||
        cases.some((item) => !iconDebugCorrect(item, row.studentId))
      ) {
        incorrectRows++;
      }

      for (const item of cases) {
        if (iconDebugCorrect(item, row.studentId)) {
          correct++;

          if (item.match?.uncertain) {
            uncertain++;
          }
        }
      }
    }

    return { correct, uncertain, incorrectRows, total };
  }, [rows]);

  const filtered = useMemo(
    () =>
      incorrectOnly
        ? rows.filter(
            (row) =>
              row.error ||
              iconDebugCases(row).some(
                (item) => !iconDebugCorrect(item, row.studentId),
              ),
          )
        : rows,
    [rows, incorrectOnly],
  );

  const lastPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, lastPage);

  function cancel() {
    abortRef.current?.abort();

    for (const runner of runnersRef.current) {
      runner.dispose();
    }

    generationRef.current++;
    abortRef.current = undefined;

    setRunning(false);
    setStatus("Canceled - completed rows retained");
  }

  async function run() {
    if (abortRef.current) {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const generation = ++generationRef.current;

    for (const runner of runnersRef.current) {
      runner.dispose();
    }

    runnersRef.current = [];
    runnerRef.current = undefined;

    setRows([]);
    setPage(0);
    setError(undefined);
    setRunning(true);
    setStatus("Loading template and production icon catalog…");

    const active = () =>
      !controller.signal.aborted && generationRef.current === generation;

    try {
      const { PvpIconDebugRunner } = await import("@/lib/pvp/icon-debug");

      if (!active()) {
        return;
      }

      const concurrency = Math.min(
        students.length,
        4,
        Math.max(1, (navigator.hardwareConcurrency || 2) - 1),
      );

      const runners = Array.from(
        { length: concurrency },
        () => new PvpIconDebugRunner(),
      );

      runnersRef.current = runners;
      runnerRef.current = runners[0];

      await Promise.all(
        runners.map((runner) => runner.warmup(controller.signal, students)),
      );

      if (!active()) {
        return;
      }

      const ids = students.map((student) => student.id);
      const results: (IconDebugResult | undefined)[] = new Array(
        students.length,
      );

      let completed = 0;

      setStatus(
        `Testing 0/${students.length} · ${concurrency} parallel workers`,
      );

      await runIconDebugPool(
        students,
        concurrency,
        controller.signal,
        async (student, index, lane) => {
          if (!active()) {
            return;
          }

          let result: IconDebugResult;

          try {
            result = await runners[lane].test(
              student.id,
              ids,
              controller.signal,
            );
          } catch (cause) {
            if (!active()) {
              return;
            }

            result = failedIconDebugResult(
              student.id,
              cause instanceof Error ? cause.message : "Detection failed",
              student.combatClass,
            );
          }

          if (!active()) {
            return;
          }

          results[index] = result;
          completed++;

          setRows(
            results.filter((row): row is IconDebugResult => row !== undefined),
          );

          setStatus(
            `Testing ${completed}/${students.length} · ${concurrency} parallel workers`,
          );

          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          );
        },
      );

      if (active()) {
        setStatus("Complete");
      }
    } catch (cause) {
      if (active()) {
        setError(
          cause instanceof Error ? cause.message : "Unable to start icon tests",
        );
        setStatus("Failed to start");
        controller.abort();
      }
    } finally {
      if (generationRef.current === generation) {
        for (const runner of runnersRef.current) {
          runner.dispose();
        }

        abortRef.current = undefined;
        setRunning(false);
      }
    }
  }

  return (
    <main className="container mx-auto flex flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">PVP student icon test runner</h1>
        <Link href="/pvp/screenshot-debug" className="underline">
          Screenshot ROI debugger
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => void run()}
          disabled={running || !students.length}
        >
          Run for all {students.length} students
        </Button>

        {running && (
          <Button variant="outline" onClick={cancel}>
            Cancel
          </Button>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={incorrectOnly}
            onChange={(event) => {
              setIncorrectOnly(event.target.checked);
              setPage(0);
            }}
          />
          Incorrect results only
        </label>
      </div>

      <div aria-live="polite" className="flex flex-col gap-2">
        <p>{status}</p>

        <Progress
          value={students.length ? (rows.length / students.length) * 100 : 0}
        />

        <p className="text-sm text-muted-foreground">
          {rows.length}/{students.length} students · {summary.correct}/
          {summary.total} correct cases · {summary.total - summary.correct}{" "}
          incorrect cases · {summary.uncertain} correct but uncertain ·{" "}
          {summary.incorrectRows} students with errors
        </p>

        {error && <p className="text-destructive">{error}</p>}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {[
              "Icon",
              "ROI",
              "Expected",
              "Opponent student rep",
              "My team",
              "Opponent team",
            ].map((label) => (
              <TableHead key={label}>{label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {filtered
            .slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
            .map((row) => (
              <TableRow key={row.studentId}>
                <TableCell>
                  <img
                    src={buildStudentIconUrlFromId(row.studentId)}
                    alt={studentMap[row.studentId]?.name ?? row.studentId}
                    loading="lazy"
                    className="h-16 w-20 object-contain"
                  />
                </TableCell>

                <TableCell>
                  <CropCollection row={row} />
                </TableCell>

                <TableCell className="max-w-64 whitespace-normal">
                  <p>{studentMap[row.studentId]?.name ?? row.studentId}</p>

                  {row.error && (
                    <p className="break-all text-xs text-destructive">
                      {row.error}
                    </p>
                  )}

                  <ScreenshotPreview
                    studentId={row.studentId}
                    runner={runnerRef.current}
                    disabled={running}
                  />
                </TableCell>

                <TableCell className="align-top">
                  <MatchResult
                    result={row.representative}
                    expectedId={row.studentId}
                  />
                </TableCell>

                {[row.myTeam, row.opponentTeam].map((team, side) => (
                  <TableCell key={side} className="align-top">
                    <div className="flex flex-col gap-2">
                      {team.map((result, index) => (
                        <MatchResult
                          key={index}
                          result={result}
                          expectedId={row.studentId}
                          slot={index + 1}
                        />
                      ))}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!filtered.length && (
            <TableRow>
              <TableCell colSpan={6}>
                {rows.length
                  ? "No incorrect results."
                  : "Run the tests to see results."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous
          </Button>

          <span>
            Page {currentPage + 1}/{lastPage + 1}
          </span>

          <Button
            variant="outline"
            disabled={currentPage === lastPage}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </main>
  );
}

function MatchResult({
  result,
  expectedId,
  slot,
}: { result: IconDebugCase; expectedId: string; slot?: number }) {
  const { studentMap } = useStudents();

  const correct = iconDebugCorrect(result, expectedId);
  const uncertain = correct && result.match?.uncertain;

  const id = result.match?.studentId;

  if (result.skipped) {
    return (
      <p className="text-xs text-muted-foreground">{slot}. Not applicable</p>
    );
  }

  return (
    <details className="max-w-64 whitespace-normal text-xs">
      <summary
        className={cn(
          "cursor-pointer",
          !correct && "text-destructive",
          result.error && "break-all",
          uncertain && "text-type-yellow",
        )}
      >
        {slot && `${slot}. `}
        {id ? (studentMap[id]?.name ?? id) : (result.error ?? "No match")}
        {id && result.error ? ` · ${result.error}` : ""}
        {!correct ? " · incorrect" : uncertain ? " · uncertain" : " · correct"}
      </summary>

      {result.match && (
        <div className="mt-1 flex flex-col gap-1 text-muted-foreground">
          <p>
            Confidence: {result.match.confidence.toFixed(1)} · margin:{" "}
            {(result.match.margin * 100).toFixed(1)}% · uncertain:{" "}
            {String(result.match.uncertain)}
          </p>

          {result.match.candidates.map((candidate) => (
            <p key={candidate.studentId}>
              {studentMap[candidate.studentId]?.name ?? candidate.studentId}:
              distance {candidate.distance.toFixed(2)}
            </p>
          ))}
        </div>
      )}
    </details>
  );
}

function CropCollection({ row }: { row: IconDebugResult }) {
  const ref = useRef<HTMLCanvasElement>(null);

  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const canvas = ref.current;

    if (!canvas) {
      return;
    }

    canvas.width = 180;
    canvas.height = 100;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    const scratch = document.createElement("canvas");

    for (const [group, cases] of [
      [row.representative],
      row.myTeam,
      row.opponentTeam,
    ].entries()) {
      for (const [index, item] of cases.entries()) {
        if (item.crop && drawPvpPixels(scratch, item.crop)) {
          ctx.drawImage(scratch, index * 30, group * 34, 28, 28);
        }
      }
    }
  }, [row]);

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">
        Rep / My 1–6 / Opponent 1–6
      </p>

      <canvas
        ref={ref}
        role="img"
        aria-label="Detected representative, own team, and opponent team crops"
        className="h-[100px] w-[180px]"
      />

      <details onToggle={(event) => setExpanded(event.currentTarget.open)}>
        <summary className="cursor-pointer text-xs">Larger crops</summary>

        {expanded && (
          <div className="flex flex-col gap-2">
            {[[row.representative], row.myTeam, row.opponentTeam].flatMap(
              (group, side) =>
                group.map(
                  (item, index) =>
                    !item.skipped && (
                      <div key={`${side}-${index}`}>
                        <p className="text-xs">
                          {side === 0
                            ? "Representative"
                            : `${side === 1 ? "My team" : "Opponent team"} ${index + 1}`}
                        </p>

                        {item.crop ? (
                          <PvpCropPreview image={item.crop} />
                        ) : (
                          <p className="text-xs text-destructive">
                            No detected crop
                          </p>
                        )}
                      </div>
                    ),
                ),
            )}
          </div>
        )}
      </details>
    </div>
  );
}

function ScreenshotPreview({
  studentId,
  runner,
  disabled,
}: { studentId: string; runner?: PvpIconDebugRunner; disabled: boolean }) {
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const controllerRef = useRef<AbortController | undefined>(undefined);

  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  async function preview() {
    if (!runner || loading) {
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(undefined);

    try {
      const screenshot = await runner.screenshot(studentId, controller.signal);

      if (!controller.signal.aborted) {
        setUrl(URL.createObjectURL(screenshot));
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Preview failed");
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || !runner || loading}
        onClick={() => void preview()}
      >
        {loading ? "Generating…" : "Preview screenshot"}
      </Button>

      {url && (
        <>
          <a href={url} target="_blank" rel="noreferrer">
            <img
              src={url}
              alt={`Generated screenshot for ${studentId}`}
              className="w-56 rounded border"
            />
          </a>

          <Button variant="ghost" size="sm" onClick={() => setUrl(undefined)}>
            Close preview
          </Button>
        </>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
