"use client";

import { PvpMatchDatePicker } from "@/app/[locale]/pvp/_components/pvp-match-date-picker";
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
import { Progress } from "@/components/ui/progress";
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
import {
  PVP_SCREENSHOT_INPUT_TYPES,
  PVP_SCREENSHOT_MAX_INPUT_SIZE,
} from "@/lib/pvp/screenshot-types";
import { cn } from "@/lib/utils";
import { useConvex, useMutation } from "convex/react";
import { format } from "date-fns";
import {
  ImagePlusIcon,
  InfoIcon,
  LoaderCircleIcon,
  TriangleAlertIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useNavigationGuard } from "next-navigation-guard";
import { useEffect, useRef, useState } from "react";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

const MAX_SCREENSHOTS = 30;

type Stage =
  | "queued"
  | "reading"
  | "extracting"
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
  const convex = useConvex();
  const recordMatch = useMutation(api.pvp.recordMatch);
  const createEnemyPreset = useMutation(api.pvp.createEnemyPreset);

  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [selectionErrors, setSelectionErrors] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [batchDate, setBatchDate] = useState<Date>();
  const [dragging, setDragging] = useState(false);

  const input = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  const abort = useRef<AbortController | null>(null);
  const clients = useRef<PvpOcrClient[]>([]);
  const mounted = useRef(true);
  const selection = useRef<Screenshot[]>([]);

  function stopExtraction() {
    abort.current?.abort();

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

  const imported = screenshots.filter(
    (item) => item.stage === "imported",
  ).length;
  const failed = screenshots.filter((item) => item.stage === "failed").length;
  const processed = imported + failed;
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
    setBatchDate(undefined);
  }

  async function handleImport() {
    if (
      abort.current ||
      completed ||
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

    const includeInStatistics =
      preferences.pvp.includeMatchesInStatisticsByDefault;

    const batch = selection.current.map((item) => ({
      ...item,
      errors: [] as ImportError[],
    }));

    const batchStudents = students;
    const batchStudentMap = studentMap;
    const presetIds = new Map<string, Id<"pvpEnemyPreset">>();

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
            message: errorMessage(
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

          update(index, { stage: "saving" });

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

          const presetKey = JSON.stringify([
            opponentName,
            opponentStudentRepId,
          ]);

          if (opponentName && !presetIds.has(presetKey)) {
            const preset = await convex.query(api.pvp.getEnemyPresetByName, {
              seasonId,
              name: opponentName,
              opponentStudentRepId,
            });

            signal.throwIfAborted();

            const presetId =
              preset?._id ??
              (await createEnemyPreset({
                seasonId,
                name: opponentName,
                opponentName,
                opponentStudentRepId,
              }));

            presetIds.set(presetKey, presetId);
          }

          signal.throwIfAborted();

          const matchId = await recordMatch({
            seasonId,
            date: selectedDate.getTime(),
            includeInStatistics,
            matchType:
              battle.battleType.value === "ATTACK" ? "attack" : "defense",
            result: battle.result.value === "WIN" ? "win" : "loss",
            ownTeam: toSavedTeam(ownTeam),
            opponentTeam: toSavedTeam(opponentTeam),
            opponentName,
            opponentStudentRepId,
            enemyPresetId: opponentName ? presetIds.get(presetKey) : undefined,
          });

          update(index, { matchId });

          if (!signal.aborted && mounted.current) {
            matchDate.rememberDate(selectedDate);
          }

          const receipt = battle.enemyNameRecognition?.receipt;

          if (!signal.aborted && opponentName && receipt) {
            try {
              await saveOpponentNameCache(receipt, matchId, seasonId);
            } catch (error) {
              addError(index, "cache", error);
            }
          }

          update(index, { stage: "imported" });
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
        <h1 className="text-xl font-bold">
          {t("tools.pvp.screenshotImport.title")}
        </h1>

        <p className="text-muted-foreground">
          {t("tools.pvp.screenshotImport.description")}
        </p>
      </div>

      <Alert>
        <InfoIcon aria-hidden="true" />

        <AlertTitle>{t("tools.pvp.screenshotImport.sameDayTitle")}</AlertTitle>

        <AlertDescription>
          {t("tools.pvp.screenshotImport.sameDay")}
        </AlertDescription>
      </Alert>

      <div className="max-w-md">
        <PvpMatchDatePicker value={matchDate} disabled={locked} />
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

      <p className="text-sm" aria-live="polite">
        {t("tools.pvp.screenshotImport.selected", {
          count: screenshots.length,
          limit: MAX_SCREENSHOTS,
        })}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {screenshots.map((item) => (
          <div
            key={item.id}
            className="group relative flex min-w-0 flex-col gap-2 rounded-lg border p-2"
          >
            <button
              type="button"
              className="rounded focus-visible:outline focus-visible:outline-ring"
              onClick={() => setPreviewId(item.id)}
              aria-label={t("tools.pvp.screenshotImport.preview", {
                name: item.file.name,
              })}
            >
              <img
                src={item.url}
                alt={item.file.name}
                className="aspect-video w-full rounded object-contain"
              />
            </button>

            <Button
              type="button"
              size="icon-sm"
              variant="default"
              className="absolute right-1 top-1 opacity-0 shadow-sm group-hover:opacity-100 group-focus-within:opacity-100 disabled:hidden motion-reduce:transition-none [@media(hover:none)]:opacity-100"
              disabled={locked}
              aria-label={t("tools.pvp.screenshotImport.remove", {
                name: item.file.name,
              })}
              title={t("tools.pvp.screenshotImport.remove", {
                name: item.file.name,
              })}
              onClick={() => removeScreenshot(item.id)}
            >
              <XIcon />
            </Button>

            <span className="truncate text-sm" title={item.file.name}>
              {item.file.name}
            </span>

            {(running || completed) && (
              <span className="text-xs text-muted-foreground">
                {t(`tools.pvp.screenshotImport.stages.${item.stage}`)}
              </span>
            )}
          </div>
        ))}
      </div>

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
            {t("tools.pvp.screenshotImport.counts", { imported, failed })}
          </p>

          {screenshots
            .filter((item) =>
              ["reading", "extracting", "saving"].includes(item.stage),
            )
            .map((item) => (
              <p className="truncate text-sm" key={item.id}>
                {item.file.name}:{" "}
                {t(`tools.pvp.screenshotImport.stages.${item.stage}`)}
              </p>
            ))}
        </div>
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
            disabled={running || !screenshots.length || !students.length}
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

        <Button variant="outline" asChild>
          <Link href={agenda}>
            {t("tools.pvp.screenshotImport.viewAgenda")}
          </Link>
        </Button>
      </div>

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
