"use client";

import { PvpMatchDatePicker } from "@/app/[locale]/pvp/_components/pvp-match-date-picker";
import type {
  PvpMatchReview,
  PvpMatchValues,
} from "@/app/[locale]/pvp/_components/pvp-match-editor";
import { PvpScreenshotImportItem } from "@/app/[locale]/pvp/_components/pvp-screenshot-import-item";
import { MessageBox } from "@/components/common/message-box";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useUserPreferences } from "@/hooks/use-preferences";
import { usePvpMatchDate } from "@/hooks/use-pvp-match-date";
import { useStudents } from "@/hooks/use-students";
import { Link, useRouter } from "@/i18n/navigation";
import { useQueryWithStatus } from "@/lib/convex";
import { type PvpBattleInfo, resolvePvpReportTeam } from "@/lib/pvp";
import type { PvpOcrClient } from "@/lib/pvp/ocr";
import { saveOpponentNameCache } from "@/lib/pvp/opponent-name-client";
import { runOrderedScreenshotImport } from "@/lib/pvp/ordered-import";
import { getScreenshotROIs } from "@/lib/pvp/screenshot";
import { PvpScreenshotAlignmentError } from "@/lib/pvp/screenshot-layout";
import {
  PVP_SCREENSHOT_INPUT_TYPES,
  PVP_SCREENSHOT_MAX_INPUT_SIZE,
} from "@/lib/pvp/screenshot-types";
import { Storage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useMutation } from "convex/react";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ImagePlusIcon,
  InfoIcon,
  LoaderCircleIcon,
  TriangleAlertIcon,
  UploadIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useNavigationGuard } from "next-navigation-guard";
import dynamic from "next/dynamic";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

const PVPMatchEditor = dynamic(() =>
  import("@/app/[locale]/pvp/_components/pvp-match-editor").then(
    (module) => module.PVPMatchEditor,
  ),
);

const MAX_SCREENSHOTS = 30;
const assistedModeStorage = new Storage<boolean>("pvp_assisted_import_mode");

type Stage =
  | "queued"
  | "reading"
  | "extracting"
  | "reviewing"
  | "skipped"
  | "stopped"
  | "ready"
  | "saving"
  | "imported"
  | "failed";

type ImportError = { stage: Stage | "cache"; message: string };

type Screenshot = {
  id: string;
  file: File;
  url: string;
  stage: Stage;
  matchId?: Id<"pvpMatchRecord">;
  errors: ImportError[];
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function PvpScreenshotImport({
  seasonId,
}: { seasonId: Id<"pvpSeason"> }) {
  const t = useTranslations();

  const router = useRouter();

  const matchDate = usePvpMatchDate();
  const { students, studentMap } = useStudents();
  const { preferences } = useUserPreferences();

  const season = useQueryWithStatus(api.pvp.getSeason, { seasonId });
  const recordMatch = useMutation(api.pvp.recordMatch);

  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [selectionErrors, setSelectionErrors] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [assistedMode, setAssistedMode] = useState(false);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const [review, setReview] = useState<
    (PvpMatchReview & { index: number }) | null
  >(null);
  const [stopConfirm, setStopConfirm] = useState(false);
  const [stopped, setStopped] = useState(false);
  const reviewSaving = useRef(false);
  const cancelReview = useRef<(() => void) | null>(null);

  useEffect(() => {
    try {
      setAssistedMode(assistedModeStorage.get() === true);
    } catch {
      // ignore
    } finally {
      setPreferenceLoaded(true);
    }
  }, []);

  const [batchDate, setBatchDate] = useState<Date>();
  const [dragging, setDragging] = useState(false);
  const [includeInStatistics, setIncludeInStatistics] = useState(
    preferences.pvp.includeMatchesInStatisticsByDefault,
  );
  const statisticsPreferenceTouched = useRef(false);

  const input = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  const abort = useRef<AbortController | null>(null);
  const clients = useRef<PvpOcrClient[]>([]);
  const mounted = useRef(true);
  const selection = useRef<Screenshot[]>([]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function stopExtraction() {
    abort.current?.abort();
    cancelReview.current?.();
    cancelReview.current = null;

    if (mounted.current) {
      setReview(null);
    }

    for (const client of clients.current) {
      client?.dispose();
    }

    clients.current = [];
  }

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;

      stopExtraction();

      for (const url of urls.current) {
        URL.revokeObjectURL(url);
      }

      urls.current.clear();
    };
  }, []);

  const navigationGuard = useNavigationGuard({
    enabled: () => abort.current !== null,
  });

  const locked = running || completed;

  useEffect(() => {
    if (statisticsPreferenceTouched.current || locked) {
      return;
    }

    setIncludeInStatistics(preferences.pvp.includeMatchesInStatisticsByDefault);
  }, [locked, preferences.pvp.includeMatchesInStatisticsByDefault]);

  const imported = screenshots.filter(
    (item) => item.stage === "imported",
  ).length;
  const failed = screenshots.filter((item) => item.stage === "failed").length;
  const skipped = screenshots.filter((item) => item.stage === "skipped").length;
  const processed = imported + failed + skipped;
  const errors = screenshots.filter((item) => item.errors.length > 0);
  const preview = screenshots.find((item) => item.id === previewId);

  const agenda = `/pvp/${seasonId}?end=${format(batchDate ?? matchDate.date, "yyyy-MM-dd")}`;

  function selectFiles(files: File[]) {
    if (abort.current || completed) {
      return;
    }

    const rejected: string[] = [];

    const accepted = files.filter((file) => {
      if (
        !PVP_SCREENSHOT_INPUT_TYPES.some((type) => type === file.type) ||
        file.size === 0 ||
        file.size > PVP_SCREENSHOT_MAX_INPUT_SIZE
      ) {
        rejected.push(
          t("tools.pvp.screenshotImport.invalidFile", { name: file.name }),
        );

        return false;
      }

      return true;
    });

    if (selection.current.length + accepted.length > MAX_SCREENSHOTS) {
      rejected.push(
        t("tools.pvp.screenshotImport.limitExceeded", {
          limit: MAX_SCREENSHOTS,
        }),
      );

      setSelectionErrors(rejected);

      return;
    }

    const added: Screenshot[] = accepted.map((file) => {
      const url = URL.createObjectURL(file);
      urls.current.add(url);

      return {
        id: crypto.randomUUID(),
        file,
        url,
        stage: "queued",
        errors: [],
      };
    });

    selection.current = [...selection.current, ...added];

    setScreenshots(selection.current);
    setSelectionErrors(rejected);
  }

  const handlePaste = useEffectEvent((event: ClipboardEvent) => {
    if (locked || !event.clipboardData) {
      return;
    }

    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (!files.length) {
      return;
    }

    event.preventDefault();
    selectFiles(files);
  });

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      handlePaste(event);
    }

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  function removeScreenshot(id: string) {
    if (abort.current || completed) {
      return;
    }

    const item = selection.current.find((item) => item.id === id);

    if (item) {
      URL.revokeObjectURL(item.url);
      urls.current.delete(item.url);
    }

    selection.current = selection.current.filter((item) => item.id !== id);
    setScreenshots(selection.current);

    if (previewId === id) {
      setPreviewId(null);
    }
  }

  function reorderScreenshot(id: string, newIndex: number) {
    if (abort.current || completed) {
      return;
    }

    const oldIndex = selection.current.findIndex((item) => item.id === id);

    if (
      oldIndex < 0 ||
      newIndex < 0 ||
      newIndex >= selection.current.length ||
      oldIndex === newIndex
    ) {
      return;
    }

    selection.current = arrayMove(selection.current, oldIndex, newIndex);
    setScreenshots(selection.current);
  }

  function handleScreenshotDragEnd({ active, over }: DragEndEvent) {
    if (!over) {
      return;
    }

    const newIndex = selection.current.findIndex((item) => item.id === over.id);
    reorderScreenshot(String(active.id), newIndex);
  }

  function startNewBatch() {
    for (const url of urls.current) {
      URL.revokeObjectURL(url);
    }

    urls.current.clear();
    selection.current = [];

    setScreenshots([]);
    setSelectionErrors([]);
    setPreviewId(null);
    setCompleted(false);
    setStopped(false);
    setBatchDate(undefined);
  }

  async function handleImport() {
    if (
      abort.current ||
      completed ||
      !preferenceLoaded ||
      !selection.current.length ||
      !season.data ||
      !students.length
    ) {
      return;
    }

    const controller = new AbortController();
    abort.current = controller;

    const { signal } = controller;
    const selectedDate = new Date(matchDate.date);

    const batchIncludeInStatistics = includeInStatistics;
    const batchAssistedMode = assistedMode;

    const batch = selection.current.map((item) => ({
      ...item,
      errors: [] as ImportError[],
    }));

    const batchStudents = students;
    const batchStudentMap = studentMap;

    setBatchDate(selectedDate);
    setRunning(true);
    setDragging(false);
    setSelectionErrors([]);
    setScreenshots(batch);

    function update(index: number, changes: Partial<Screenshot>) {
      batch[index] = { ...batch[index], ...changes };

      if (mounted.current && !signal.aborted) {
        setScreenshots([...batch]);
      }
    }

    function addError(
      index: number,
      stage: ImportError["stage"],
      error: unknown,
    ) {
      update(index, {
        errors: [
          ...batch[index].errors,
          {
            stage,
            message:
              error instanceof PvpScreenshotAlignmentError
                ? t("tools.pvp.screenshotImport.alignmentFailed")
                : errorMessage(
                    error,
                    t("tools.pvp.screenshotImport.unknownError"),
                  ),
          },
        ],
      });
    }

    const engine = import("@/lib/pvp/ocr");

    void engine.catch(() => {});

    try {
      await runOrderedScreenshotImport<PvpBattleInfo>({
        count: batch.length,
        signal,
        extract: async (index, lane) => {
          update(index, { stage: "reading" });

          const [rois, { PvpOcrClient }] = await Promise.all([
            getScreenshotROIs(batch[index].file),
            engine,
          ]);

          signal.throwIfAborted();
          clients.current[lane] ??= new PvpOcrClient();

          update(index, { stage: "extracting" });

          const result = await clients.current[lane].extract(rois, {
            signal,
            students: batchStudents,
          });

          signal.throwIfAborted();

          if (!result.valid || !result.battle) {
            throw new Error(t("tools.pvp.screenshotImport.invalidReport"));
          }

          if (!result.battle.battleType.value || !result.battle.result.value) {
            throw new Error(t("tools.pvp.screenshotImport.missingRequired"));
          }

          update(index, { stage: "ready" });

          return result.battle;
        },
        save: async (index, battle) => {
          signal.throwIfAborted();

          const ownTeam = resolvePvpReportTeam(battle.myUnits, batchStudents);
          const opponentTeam = resolvePvpReportTeam(
            battle.enemyUnits,
            batchStudents,
          );

          const toSavedTeam = (team: typeof ownTeam) => {
            return team.map((item) => ({
              studentId: item.student?.id,
              damage: item.damage,
            }));
          };

          const opponentName =
            battle.enemyNameStatus === "anonymous"
              ? undefined
              : (battle.enemyName.value ?? undefined);

          const representative = battle.enemyStudentRep.iconMatch.studentId;

          const opponentStudentRepId =
            representative && batchStudentMap[representative]
              ? representative
              : undefined;

          const initial: PvpMatchValues = {
            date: selectedDate.getTime(),
            includeInStatistics: batchIncludeInStatistics,
            matchType:
              battle.battleType.value === "ATTACK" ? "attack" : "defense",
            result: battle.result.value === "WIN" ? "win" : "loss",
            ownTeam: toSavedTeam(ownTeam),
            opponentTeam: toSavedTeam(opponentTeam),
            opponentName,
            opponentStudentRepId,
          };

          async function persist(values: PvpMatchValues) {
            signal.throwIfAborted();

            update(index, { stage: "saving" });

            const name = values.opponentName?.trim() || undefined;

            const matchId = await recordMatch({
              ...values,
              seasonId,
              date: selectedDate.getTime(),
              includeInStatistics: batchIncludeInStatistics,
              opponentName: name,
              autoCreateEnemyPreset: true,
            });

            update(index, { matchId });
            if (!signal.aborted && mounted.current) {
              matchDate.rememberDate(selectedDate);
            }

            const receipt = battle.enemyNameRecognition?.receipt;

            if (!signal.aborted && name && receipt) {
              try {
                await saveOpponentNameCache(receipt, matchId, seasonId);
              } catch (error) {
                addError(index, "cache", error);
              }
            }

            update(index, { stage: "imported" });
          }

          if (!batchAssistedMode) {
            await persist(initial);
            return;
          }

          update(index, { stage: "reviewing" });

          await new Promise<void>((resolve) => {
            let settled = false;

            const finish = () => {
              if (settled) {
                return;
              }

              settled = true;
              cancelReview.current = null;

              if (mounted.current) {
                setReview((current) =>
                  current ? { ...current, pending: true } : current,
                );
              }

              resolve();
            };

            cancelReview.current = finish;

            setReview({
              index,
              initial,
              nameUncertain: battle.enemyName.uncertain,
              final: index === batch.length - 1,
              onSubmit: async (values) => {
                if (settled || reviewSaving.current || signal.aborted) {
                  return;
                }

                reviewSaving.current = true;

                try {
                  await persist(values);
                  finish();
                } catch (error) {
                  update(index, { stage: "reviewing" });
                  throw error;
                } finally {
                  reviewSaving.current = false;
                }
              },
              onSkip: () => {
                if (settled || reviewSaving.current || signal.aborted) {
                  return;
                }

                update(index, { stage: "skipped" });
                finish();
              },
              onStop: () => {
                if (!reviewSaving.current) {
                  setStopConfirm(true);
                }
              },
            });
          });
        },
        onError: (index, phase, error) => {
          addError(
            index,
            phase === "save" ? "saving" : batch[index].stage,
            error,
          );

          update(index, { stage: "failed" });
        },
      });

      if (!signal.aborted && mounted.current) {
        setCompleted(true);

        if (
          batch.every(
            (item) => item.stage === "imported" && item.errors.length === 0,
          )
        ) {
          abort.current = null;

          router.push(
            `/pvp/${seasonId}?end=${format(selectedDate, "yyyy-MM-dd")}`,
          );
        }
      }
    } finally {
      for (const client of clients.current) {
        client?.dispose();
      }

      clients.current = [];

      if (abort.current === controller) {
        abort.current = null;
      }

      if (mounted.current) {
        setReview(null);
        setRunning(false);
      }
    }
  }

  if (season.status === "pending") {
    return <MessageBox>{t("common.loading")}</MessageBox>;
  }

  if (season.status === "error" || !season.data) {
    return (
      <MessageBox>
        {t("tools.pvp.screenshotImport.seasonUnavailable")}
      </MessageBox>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link
              href={agenda}
              aria-label={t("common.backTo", {
                destination: t("tools.pvp.title"),
              })}
            >
              <ChevronLeftIcon />
            </Link>
          </Button>

          <h1 className="text-xl font-bold">
            {t("tools.pvp.screenshotImport.title")}
          </h1>
        </div>

        <p className="text-muted-foreground">
          {t("tools.pvp.screenshotImport.description")}
        </p>
      </div>

      <Alert>
        <TriangleAlertIcon aria-hidden="true" />
        <AlertDescription>
          {t("tools.pvp.screenshotImport.extractionNotice")}
        </AlertDescription>
      </Alert>

      <Alert>
        <InfoIcon aria-hidden="true" />

        <AlertTitle>{t("tools.pvp.screenshotImport.sameDayTitle")}</AlertTitle>

        <AlertDescription>
          <p>{t("tools.pvp.screenshotImport.sameDay")}</p>
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Switch
            id="pvp-assisted-import"
            checked={assistedMode}
            disabled={locked || !preferenceLoaded}
            onCheckedChange={(checked) => {
              setAssistedMode(checked);
              try {
                assistedModeStorage.set(checked);
              } catch {
                //ignore
              }
            }}
          />

          <Label htmlFor="pvp-assisted-import">
            {t("tools.pvp.screenshotImport.assistedMode")}
          </Label>
        </div>

        <p className="text-sm text-muted-foreground">
          {t("tools.pvp.screenshotImport.assistedModeHint")}
        </p>
      </div>

      <div className="max-w-md">
        <PvpMatchDatePicker value={matchDate} disabled={locked} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Switch
            id="pvp-import-include-statistics"
            checked={includeInStatistics}
            disabled={locked || !season.data?.seasonNumber}
            onCheckedChange={(checked) => {
              statisticsPreferenceTouched.current = true;
              setIncludeInStatistics(checked);
            }}
          />

          <Label htmlFor="pvp-import-include-statistics">
            {t("tools.pvp.screenshotImport.includeInStatistics")}
          </Label>
        </div>

        <p className="text-sm text-muted-foreground">
          {t("tools.pvp.match.includeInStatisticsHint")}
        </p>

        <p className="text-xs text-muted-foreground">
          {t("tools.pvp.match.includeInStatisticsPreferenceHint")}
        </p>
      </div>

      <button
        type="button"
        className={cn(
          "group flex min-h-56 w-full cursor-pointer flex-col items-center justify-center gap-6 rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none sm:min-h-44 sm:flex-row sm:justify-start sm:gap-8 sm:px-8 sm:text-left",
          dragging && "border-primary bg-primary/10 ring-2 ring-primary/20",
        )}
        disabled={locked}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!locked) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          selectFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <span
          className="pointer-events-none relative flex size-20 shrink-0 items-center justify-center"
          aria-hidden="true"
        >
          <span className="absolute inset-2 -rotate-12 rounded-xl border border-primary/20 bg-primary/10" />
          <span className="absolute inset-2 rotate-6 rounded-xl border border-primary/20 bg-background" />
          <span className="relative flex size-16 items-center justify-center rounded-xl border border-primary/20 bg-background text-primary shadow-sm">
            <ImagePlusIcon className="size-8" />
          </span>
        </span>

        <span className="pointer-events-none flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-lg font-semibold text-foreground">
            {dragging
              ? t("tools.pvp.screenshotImport.dropActive")
              : t("tools.pvp.screenshotImport.drop")}
          </span>

          <span className="text-sm leading-relaxed text-muted-foreground">
            {t("tools.pvp.screenshotImport.dropHint", {
              limit: MAX_SCREENSHOTS,
            })}
          </span>

          <span className="text-sm text-muted-foreground">
            {t("tools.pvp.screenshotImport.pasteHint")}
          </span>
        </span>

        <span className="pointer-events-none inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm">
          <UploadIcon className="size-4" aria-hidden="true" />
          {t("tools.pvp.screenshotImport.browse")}
        </span>
      </button>

      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        {t("tools.pvp.screenshotImport.formats", { limit: MAX_SCREENSHOTS })}
      </p>

      <input
        ref={input}
        type="file"
        accept={PVP_SCREENSHOT_INPUT_TYPES.join(",")}
        multiple
        hidden
        disabled={locked}
        onChange={(event) => {
          selectFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />

      {selectionErrors.length > 0 && (
        <Alert>
          <TriangleAlertIcon className="text-destructive" aria-hidden="true" />
          <AlertTitle>
            {t("tools.pvp.screenshotImport.selectionErrors")}
          </AlertTitle>

          <AlertDescription>
            <ul>
              {selectionErrors.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm" aria-live="polite">
          {t("tools.pvp.screenshotImport.selected", {
            count: screenshots.length,
            limit: MAX_SCREENSHOTS,
          })}
        </p>

        <p className="text-sm text-muted-foreground">
          {t("tools.pvp.screenshotImport.ordering")}
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleScreenshotDragEnd}
      >
        <SortableContext
          items={screenshots.map((item) => item.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {screenshots.map((item) => (
              <PvpScreenshotImportItem
                key={item.id}
                item={item}
                locked={locked}
                status={
                  running || completed
                    ? t(`tools.pvp.screenshotImport.stages.${item.stage}`)
                    : undefined
                }
                onPreview={setPreviewId}
                onRemove={removeScreenshot}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {(running || completed) && (
        <div className="flex flex-col gap-2" aria-live="polite">
          <Progress
            value={
              screenshots.length ? (processed / screenshots.length) * 100 : 0
            }
            aria-label={t("tools.pvp.screenshotImport.progress", {
              processed,
              total: screenshots.length,
            })}
            aria-valuenow={processed}
            aria-valuemin={0}
            aria-valuemax={screenshots.length}
          />

          <p>
            {t("tools.pvp.screenshotImport.progress", {
              processed,
              total: screenshots.length,
            })}
          </p>

          <p className="text-sm text-muted-foreground">
            {t("tools.pvp.screenshotImport.counts", {
              imported,
              failed,
              skipped,
            })}
          </p>

          {screenshots
            .filter((item) =>
              ["reading", "extracting", "reviewing", "saving"].includes(
                item.stage,
              ),
            )
            .map((item) => (
              <p className="truncate text-sm" key={item.id}>
                {item.file.name}:{" "}
                {t(`tools.pvp.screenshotImport.stages.${item.stage}`)}
              </p>
            ))}
        </div>
      )}

      {completed && stopped && (
        <Alert>
          <AlertDescription>
            {t("tools.pvp.screenshotImport.stopped")}
          </AlertDescription>
        </Alert>
      )}

      {completed && (
        <Button variant="outline" asChild>
          <Link href={agenda}>
            {t("tools.pvp.screenshotImport.viewAgenda")}
          </Link>
        </Button>
      )}

      {completed && errors.length > 0 && (
        <section
          className="flex flex-col gap-3"
          aria-labelledby="import-error-heading"
        >
          <h2 id="import-error-heading" className="text-lg font-semibold">
            {t("tools.pvp.screenshotImport.errorReport")}
          </h2>

          {errors.map((item) => (
            <Alert key={item.id}>
              <TriangleAlertIcon
                className="text-destructive"
                aria-hidden="true"
              />
              <AlertTitle className="line-clamp-none break-all">
                {item.file.name}
              </AlertTitle>

              <AlertDescription className="gap-3">
                <p>
                  {item.matchId
                    ? t("tools.pvp.screenshotImport.savedWithErrors")
                    : t("tools.pvp.screenshotImport.notSaved")}
                </p>

                <ul className="flex flex-col gap-3">
                  {item.errors.map((error, index) => (
                    <li key={index} className="whitespace-pre-wrap break-words">
                      <p className="font-medium text-foreground">
                        {t(`tools.pvp.screenshotImport.stages.${error.stage}`)}
                      </p>
                      <p>{error.message}</p>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewId(item.id)}
                  >
                    {t("tools.pvp.screenshotImport.viewScreenshot")}
                  </Button>

                  {item.matchId && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/pvp/${seasonId}/match/${item.matchId}`}>
                        {t("tools.pvp.screenshotImport.editMatch")}
                      </Link>
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {!completed ? (
          <Button
            disabled={
              running ||
              !preferenceLoaded ||
              !screenshots.length ||
              !students.length
            }
            onClick={() => void handleImport()}
          >
            {running ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <UploadIcon />
            )}
            {running
              ? t("tools.pvp.screenshotImport.importing")
              : t("tools.pvp.screenshotImport.import")}
          </Button>
        ) : (
          <Button onClick={startNewBatch}>
            {t("tools.pvp.screenshotImport.startNewBatch")}
          </Button>
        )}
      </div>

      <Dialog
        open={!!review}
        onOpenChange={(open) => {
          if (!open && !reviewSaving.current) setStopConfirm(true);
        }}
      >
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto sm:max-w-[min(90rem,calc(100vw-2rem))]"
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            if (!reviewSaving.current) setStopConfirm(true);
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {t("tools.pvp.screenshotImport.reviewTitle", {
                current: (review?.index ?? 0) + 1,
                total: screenshots.length,
              })}
            </DialogTitle>

            <DialogDescription className="break-all">
              {review && screenshots[review.index]?.file.name}
            </DialogDescription>
          </DialogHeader>

          {review && (
            <>
              <button
                type="button"
                className="cursor-zoom-in rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t("tools.pvp.screenshotImport.preview", {
                  name: screenshots[review.index].file.name,
                })}
                onClick={() => setPreviewId(screenshots[review.index].id)}
              >
                <img
                  src={screenshots[review.index].url}
                  alt={screenshots[review.index].file.name}
                  className="max-h-72 w-full object-contain"
                />
              </button>

              <PVPMatchEditor
                key={screenshots[review.index].id}
                seasonId={seasonId}
                review={review}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={stopConfirm} onOpenChange={setStopConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("tools.pvp.screenshotImport.stopTitle")}
            </DialogTitle>

            <DialogDescription>
              {t("tools.pvp.screenshotImport.stopDescription")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStopConfirm(false)}>
              {t("tools.pvp.screenshotImport.keepImporting")}
            </Button>

            <Button
              variant="destructive"
              onClick={() => {
                if (reviewSaving.current) return;
                stopExtraction();
                setStopConfirm(false);
                setStopped(true);
                setScreenshots((items) =>
                  items.map((item) =>
                    ["imported", "failed", "skipped"].includes(item.stage)
                      ? item
                      : { ...item, stage: "stopped" },
                  ),
                );
                setCompleted(true);
              }}
            >
              {t("tools.pvp.screenshotImport.stop")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreviewId(null);
        }}
      >
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="break-all pr-6">
              {preview?.file.name}
            </DialogTitle>

            <DialogDescription>
              {t("tools.pvp.screenshotImport.previewDescription")}
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <img
              src={preview.url}
              alt={preview.file.name}
              className="max-h-[75vh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={navigationGuard.active}
        onOpenChange={(open) => {
          if (!open) navigationGuard.reject();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("tools.pvp.screenshotImport.leaveTitle")}
            </DialogTitle>

            <DialogDescription>
              {t("tools.pvp.screenshotImport.leaveDescription")}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={navigationGuard.reject}>
              {t("tools.pvp.screenshotImport.keepImporting")}
            </Button>

            <Button
              variant="destructive"
              onClick={() => {
                stopExtraction();
                navigationGuard.accept();
              }}
            >
              {t("tools.pvp.screenshotImport.leave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
