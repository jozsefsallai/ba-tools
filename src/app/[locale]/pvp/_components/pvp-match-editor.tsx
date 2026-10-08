"use client";

import { PvpMatchDatePicker } from "@/app/[locale]/pvp/_components/pvp-match-date-picker";
import { PVPMatchFormationEditor } from "@/app/[locale]/pvp/_components/pvp-match-formation-editor";
import { PVPPresetPicker } from "@/app/[locale]/pvp/_components/pvp-preset-picker";
import type {
  PVPEnemyTeam,
  PVPFormationPresetType,
  PVPFormationStudentItem,
  PVPMatchResult,
  PVPMatchType,
} from "@/app/[locale]/pvp/_lib/types";
import { MessageBox } from "@/components/common/message-box";
import { StudentPicker } from "@/components/common/student-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserPreferences } from "@/hooks/use-preferences";
import { usePvpMatchDate } from "@/hooks/use-pvp-match-date";
import { useStudents } from "@/hooks/use-students";
import { Link, useRouter } from "@/i18n/navigation";
import { correctPvpImportedItem, resolvePvpReportTeam } from "@/lib/pvp";
import type { PvpOcrClient } from "@/lib/pvp/ocr";
import { saveOpponentNameCache } from "@/lib/pvp/opponent-name-client";
import { getScreenshotROIs } from "@/lib/pvp/screenshot";
import { PvpScreenshotAlignmentError } from "@/lib/pvp/screenshot-layout";
import {
  PVP_SCREENSHOT_INPUT_TYPES,
  PVP_SCREENSHOT_MAX_INPUT_SIZE,
} from "@/lib/pvp/screenshot-types";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import type { FunctionArgs } from "convex/server";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  LoaderCircleIcon,
  SaveIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type ClipboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { api } from "~convex/api";
import type { Doc, Id } from "~convex/dataModel";
import type { Student } from "~prisma";

export type PvpMatchValues = Omit<
  FunctionArgs<typeof api.pvp.recordMatch>,
  "seasonId"
>;

export type PvpMatchReview = {
  initial: PvpMatchValues;
  nameUncertain: boolean;
  final: boolean;
  pending?: boolean;
  onSubmit: (values: PvpMatchValues) => Promise<void>;
  onSkip: () => void;
  onStop: () => void;
};

export type PVPMatchEditor = {
  seasonId: Id<"pvpSeason">;
  current?: Doc<"pvpMatchRecord">;
  review?: PvpMatchReview;
};

export function PVPMatchEditor({ seasonId, current, review }: PVPMatchEditor) {
  const t = useTranslations();
  const { studentMap } = useStudents();
  const { preferences } = useUserPreferences();

  const router = useRouter();

  const matchDate = usePvpMatchDate(!!current || !!review);
  const { date, setDate, rememberDate } = matchDate;
  const [ownRank, setOwnRank] = useState<number | undefined>();
  const [ownRankStr, setOwnRankStr] = useState<string>("");
  const [opponentName, setOpponentName] = useState<string>("");
  const [opponentRank, setOpponentRank] = useState<number | undefined>();
  const [opponentRankStr, setOpponentRankStr] = useState<string>("");
  const [opponentStudentRep, setOpponentStudentRep] = useState<
    Student | undefined
  >();
  const [matchType, setMatchType] = useState<PVPMatchType>("attack");

  const [ownTeam, setOwnTeam] = useState<PVPFormationStudentItem[]>([
    {},
    {},
    {},
    {},
    {},
    {},
  ]);

  const [opponentTeam, setOpponentTeam] = useState<PVPFormationStudentItem[]>([
    {},
    {},
    {},
    {},
    {},
    {},
  ]);

  const [result, setResult] = useState<PVPMatchResult>("win");
  const [includeInStatistics, setIncludeInStatistics] = useState(false);
  const statisticsPreferenceTouched = useRef(false);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [enemyPresetId, setEnemyPresetId] = useState<Id<"pvpEnemyPreset">>();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportStatus, setReportStatus] = useState<
    "idle" | "reading" | "extracting" | "applying"
  >("idle");

  const reportInputRef = useRef<HTMLInputElement>(null);
  const reportClientRef = useRef<Promise<PvpOcrClient> | null>(null);
  const reportAbortRef = useRef<AbortController | null>(null);
  const reportJobRef = useRef(0);
  const nameReceiptRef = useRef<string | undefined>(undefined);
  const nameCacheEligibleRef = useRef(false);
  const [nameUncertain, setNameUncertain] = useState(false);
  const reportWarmupGenerationRef = useRef(0);
  const [reportEngineStatus, setReportEngineStatus] = useState<
    "loading" | "ready" | "failed"
  >("loading");
  const reportImportState =
    reportStatus === "idle" ? reportEngineStatus : "extracting";

  const getReportClient = useCallback(() => {
    reportClientRef.current ??= import("@/lib/pvp/ocr").then(
      ({ PvpOcrClient }) => new PvpOcrClient(),
    );
    return reportClientRef.current;
  }, []);

  useEffect(
    () => () => {
      reportJobRef.current++;
      reportWarmupGenerationRef.current++;
      reportAbortRef.current?.abort();
      void reportClientRef.current?.then((client) => client.dispose());
      reportClientRef.current = null;
    },
    [],
  );

  function changeReportDialog(open: boolean) {
    setReportDialogOpen(open);

    if (open) {
      const generation = ++reportWarmupGenerationRef.current;
      setReportEngineStatus((status) =>
        status === "failed" ? "loading" : status,
      );

      void getReportClient()
        .then((client) => client.warmup())
        .then(() => {
          if (generation === reportWarmupGenerationRef.current) {
            setReportEngineStatus("ready");
          }
        })
        .catch(() => {
          if (generation === reportWarmupGenerationRef.current) {
            setReportEngineStatus("failed");
          }
        });
    } else {
      reportJobRef.current++;
      if (reportAbortRef.current && reportStatus !== "reading") {
        reportWarmupGenerationRef.current++;
        setReportEngineStatus("loading");
      }
      reportAbortRef.current?.abort();
      reportAbortRef.current = null;
      setReportStatus("idle");
    }
  }

  const [savePresetKind, setSavePresetKind] = useState<"own" | "enemy">("own");
  const [savePresetName, setSavePresetName] = useState("");
  const [savePresetUsedByMe, setSavePresetUsedByMe] = useState(true);
  const [savePresetMatchType, setSavePresetMatchType] =
    useState<PVPFormationPresetType>("attack");
  const [savePresetDialogOpen, setSavePresetDialogOpen] = useState(false);
  const [saveEnemyPresetDialogOpen, setSaveEnemyPresetDialogOpen] =
    useState(false);
  const [saveEnemyPresetName, setSaveEnemyPresetName] = useState("");
  const [ownFormationSearch, setOwnFormationSearch] = useState("");
  const [enemyFormationSearch, setEnemyFormationSearch] = useState("");
  const [enemyPresetSearch, setEnemyPresetSearch] = useState("");

  const recordMatchMutation = useMutation(api.pvp.recordMatch);
  const updateMatchMutation = useMutation(api.pvp.updateMatch);
  const formationPresets = useQuery(api.pvp.listFormationPresets, {
    seasonId,
    search: useDebounce(ownFormationSearch, 250),
  });
  const enemyFormationPresets = useQuery(api.pvp.listFormationPresets, {
    seasonId,
    search: useDebounce(enemyFormationSearch, 250),
  });
  const debouncedEnemyPresetSearch = useDebounce(enemyPresetSearch, 250);
  const {
    results: enemyPresets,
    status: enemyPresetStatus,
    loadMore: loadMoreEnemyPresets,
  } = usePaginatedQuery(
    api.pvp.listEnemyPresets,
    { seasonId, search: debouncedEnemyPresetSearch },
    { initialNumItems: 30 },
  );
  const selectedEnemyPreset = useQuery(
    api.pvp.getEnemyPreset,
    enemyPresetId ? { seasonId, presetId: enemyPresetId } : "skip",
  );
  const matchingEnemyPreset = useQuery(
    api.pvp.getEnemyPresetByName,
    opponentName.trim()
      ? {
          seasonId,
          name: opponentName.trim(),
          opponentStudentRepId: opponentStudentRep?.id,
        }
      : "skip",
  );
  const enemyTeams = useQuery(
    api.pvp.getEnemyPresetTeams,
    enemyPresetId ? { presetId: enemyPresetId } : "skip",
  );
  const defaults = useQuery(api.pvp.getSeasonDefaults, { seasonId });
  const createFormationPreset = useMutation(api.pvp.createFormationPreset);
  const createEnemyPreset = useMutation(api.pvp.createEnemyPreset);
  const updateEnemyPreset = useMutation(api.pvp.updateEnemyPreset);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const saveInFlight = useRef(false);
  const reviewInitialized = useRef(false);

  const hasValidStatisticsTeams =
    ownTeam.slice(0, 4).some((item) => item.student) &&
    opponentTeam.slice(0, 4).some((item) => item.student);

  useEffect(() => {
    if (current || review || statisticsPreferenceTouched.current) {
      return;
    }

    setIncludeInStatistics(preferences.pvp.includeMatchesInStatisticsByDefault);
  }, [current, review, preferences.pvp.includeMatchesInStatisticsByDefault]);

  const handleItemUpdate = useCallback(
    (
      kind: "own" | "enemy",
      idx: number,
      params: Partial<PVPFormationStudentItem>,
    ) => {
      const targetTeam = kind === "own" ? ownTeam : opponentTeam;
      const updatedItem = correctPvpImportedItem(targetTeam[idx], params);

      if ("report" in params) {
        updatedItem.report = params.report;
      }

      const updatedTeam = [...targetTeam];
      updatedTeam[idx] = updatedItem;

      if (kind === "own") {
        setOwnTeam(updatedTeam);
      } else {
        setOpponentTeam(updatedTeam);
      }
    },
    [ownTeam, opponentTeam],
  );

  const handleOwnItemUpdate = useCallback(
    (idx: number, params: Partial<PVPFormationStudentItem>) => {
      handleItemUpdate("own", idx, params);
    },
    [handleItemUpdate],
  );

  const handleOpponentItemUpdate = useCallback(
    (idx: number, params: Partial<PVPFormationStudentItem>) => {
      handleItemUpdate("enemy", idx, params);
    },
    [handleItemUpdate],
  );

  const handleItemMove = useCallback(
    (kind: "own" | "enemy", from: number, to: number) => {
      if (from === to || from < 4 !== to < 4) {
        return;
      }

      const setTeam = kind === "own" ? setOwnTeam : setOpponentTeam;

      setTeam((team) => {
        if (from < 0 || to < 0 || from >= team.length || to >= team.length) {
          return team;
        }

        const updated = [...team];
        const [item] = updated.splice(from, 1);
        updated.splice(to, 0, item);

        return updated;
      });
    },
    [],
  );

  useEffect(() => {
    if (current || review || !defaults) {
      return;
    }

    setOwnTeam(
      defaults.ownTeam.map((item) => {
        const value = item as {
          studentId?: string;
          level?: number;
          starLevel?: PVPFormationStudentItem["starLevel"];
          ueLevel?: PVPFormationStudentItem["ueLevel"];
        };

        return {
          student: value.studentId ? studentMap[value.studentId] : undefined,
          level: value.level,
          starLevel: value.starLevel,
          ueLevel: value.ueLevel,
        };
      }),
    );
  }, [current, review, defaults, studentMap]);

  function applyFormationPreset(kind: "own" | "enemy", presetId: string) {
    const preset = (
      kind === "own" ? formationPresets : enemyFormationPresets
    )?.find((item) => item._id === presetId);

    if (!preset) {
      return;
    }

    const team = preset.team.map((item) => ({
      student: item.studentId ? studentMap[item.studentId] : undefined,
      level: item.level,
      starLevel: item.starLevel,
      ueLevel: item.ueLevel,
    }));

    if (kind === "own") {
      setOwnTeam(team);
    } else {
      setOpponentTeam(team);
    }
  }

  function openSavePresetDialog(kind: "own" | "enemy") {
    setSavePresetKind(kind);
    setSavePresetName("");
    setSavePresetUsedByMe(kind === "own");
    setSavePresetMatchType(
      kind === "own"
        ? matchType
        : matchType === "attack"
          ? "defense"
          : "attack",
    );
    setSavePresetDialogOpen(true);
  }

  async function saveFormationPreset() {
    if (!savePresetName.trim()) {
      return;
    }

    const kind = savePresetKind;
    const team = kind === "own" ? ownTeam : opponentTeam;

    await createFormationPreset({
      seasonId,
      name: savePresetName,
      matchType: savePresetMatchType,
      usedByMe: savePresetUsedByMe,
      team: team.map((item) => ({
        studentId: item.student?.id,
        level: item.level,
        starLevel: item.starLevel,
        ueLevel: item.ueLevel,
      })),
    });

    setSavePresetDialogOpen(false);
    toast.success(t("tools.pvp.presets.formationSaved"), {
      position: "top-right",
    });
  }

  async function saveOpponentPreset() {
    if (!saveEnemyPresetName.trim()) {
      return;
    }

    const attachedPreset =
      selectedEnemyPreset ??
      enemyPresets.find((preset) => preset._id === enemyPresetId);

    const presetName = saveEnemyPresetName.trim();

    const id = attachedPreset
      ? await updateEnemyPreset({
          presetId: attachedPreset._id,
          name: presetName,
          opponentName: opponentName.trim() || presetName,
          opponentStudentRepId: opponentStudentRep?.id,
        }).then(() => attachedPreset._id)
      : await createEnemyPreset({
          seasonId,
          name: presetName,
          opponentName: opponentName.trim() || presetName,
          opponentStudentRepId: opponentStudentRep?.id,
        });

    setEnemyPresetId(id);
    setSaveEnemyPresetDialogOpen(false);
    toast.success(t("tools.pvp.presets.enemySaved"), {
      position: "top-right",
    });
  }

  const attachedOpponentPreset =
    selectedEnemyPreset ??
    enemyPresets.find((preset) => preset._id === enemyPresetId);

  const normalizedOpponentName = opponentName.trim().toLocaleLowerCase();

  const matchingOpponentPreset = Boolean(
    matchingEnemyPreset &&
      matchingEnemyPreset.opponentStudentRepId === opponentStudentRep?.id,
  );

  const canSaveOpponent =
    normalizedOpponentName.length > 0 &&
    (!attachedOpponentPreset ||
      (attachedOpponentPreset.opponentName ?? attachedOpponentPreset.name)
        .trim()
        .toLocaleLowerCase() !== normalizedOpponentName ||
      attachedOpponentPreset.opponentStudentRepId !== opponentStudentRep?.id) &&
    !matchingOpponentPreset;

  async function handleCombatReport(file: File) {
    if (reportAbortRef.current) {
      return;
    }

    const controller = new AbortController();
    reportAbortRef.current = controller;

    const job = ++reportJobRef.current;
    const active = () =>
      !controller.signal.aborted && job === reportJobRef.current;

    try {
      setReportStatus("reading");

      if (
        !PVP_SCREENSHOT_INPUT_TYPES.some((type) => type === file.type) ||
        file.size === 0 ||
        file.size > PVP_SCREENSHOT_MAX_INPUT_SIZE
      ) {
        throw new Error(
          "Screenshot must be a supported image between 1 byte and 10 MB",
        );
      }

      const [rois, client] = await Promise.all([
        getScreenshotROIs(file),
        getReportClient(),
      ]);

      if (!active()) {
        return;
      }

      setReportStatus("extracting");

      const parsed = await client.extract(rois, {
        signal: controller.signal,
        students: Object.values(studentMap),
      });

      if (!active()) {
        return;
      }

      if (parsed.valid) {
        setReportEngineStatus("ready");
      }

      if (!parsed.valid || !parsed.battle) {
        toast.error(t("tools.pvp.reportImport.invalid"), {
          position: "top-right",
        });

        return;
      }
      setReportStatus("applying");
      const battle = parsed.battle;
      const students = Object.values(studentMap);

      setOwnTeam(resolvePvpReportTeam(battle.myUnits, students));
      setOpponentTeam(resolvePvpReportTeam(battle.enemyUnits, students));

      if (battle.battleType.value) {
        setMatchType(
          battle.battleType.value === "ATTACK" ? "attack" : "defense",
        );
      }

      if (battle.result.value) {
        setResult(battle.result.value === "WIN" ? "win" : "loss");
      }

      nameReceiptRef.current = battle.enemyNameRecognition?.receipt;
      nameCacheEligibleRef.current = battle.enemyName.value != null;

      setNameUncertain(battle.enemyName.uncertain);

      if (battle.enemyNameStatus === "anonymous") {
        setOpponentName("");
      } else if (battle.enemyName.value != null) {
        setOpponentName(battle.enemyName.value);
      }

      setEnemyPresetId(undefined);

      const recognizedRep = battle.enemyStudentRep.iconMatch.studentId;
      setOpponentStudentRep(
        recognizedRep ? studentMap[recognizedRep] : undefined,
      );

      if (battle.enemyName.value) {
        const preset = enemyPresets.find(
          (candidate) => candidate.opponentName === battle.enemyName.value,
        );
        if (preset) {
          setEnemyPresetId(preset._id);
        }
      }
      toast.success(t("tools.pvp.reportImport.success"), {
        position: "top-right",
      });
      setReportDialogOpen(false);
    } catch (error) {
      if (!active()) {
        return;
      }

      console.error(error);

      toast.error(
        t(
          error instanceof PvpScreenshotAlignmentError
            ? "tools.pvp.reportImport.alignmentFailed"
            : "tools.pvp.reportImport.failed",
        ),
        {
          position: "top-right",
        },
      );
    } finally {
      if (job === reportJobRef.current) {
        reportAbortRef.current = null;
        setReportStatus("idle");
      }
    }
  }

  function handleCombatReportPaste(event: ClipboardEvent<HTMLDivElement>) {
    if (reportStatus !== "idle") {
      return;
    }

    const imageItem = Array.from(event.clipboardData.items).find(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );

    const file = imageItem?.getAsFile();

    if (!file) {
      return;
    }

    event.preventDefault();
    void handleCombatReport(file);
  }

  async function handleWantsToUpdate() {
    if (saveInFlight.current) {
      return;
    }

    saveInFlight.current = true;
    setIsSaving(true);
    setSaveError(false);

    const matchData = {
      date: review?.initial.date ?? date.getTime(),
      ownRank,
      opponentName,
      opponentRank,
      opponentStudentRepId: opponentStudentRep
        ? opponentStudentRep.id
        : undefined,
      enemyPresetId,
      matchType,
      ownTeam: ownTeam.map((item) => ({
        studentId: item.student ? item.student.id : undefined,
        level: item.level,
        starLevel: item.starLevel,
        ueLevel: item.ueLevel,
        damage: item.damage,
      })),
      opponentTeam: opponentTeam.map((item) => ({
        studentId: item.student ? item.student.id : undefined,
        level: item.level,
        starLevel: item.starLevel,
        ueLevel: item.ueLevel,
        damage: item.damage,
      })),
      result,
      videoUrl: videoUrl.trim() === "" ? undefined : videoUrl.trim(),
      includeInStatistics:
        review?.initial.includeInStatistics ?? includeInStatistics,
    };

    const cacheReceipt = nameCacheEligibleRef.current
      ? nameReceiptRef.current
      : undefined;

    const cacheSavedName = async (matchId: Id<"pvpMatchRecord">) => {
      if (!cacheReceipt) {
        return;
      }

      try {
        await saveOpponentNameCache(cacheReceipt, matchId, seasonId);
      } catch {
        toast.warning(t("tools.pvp.reportImport.cacheSaveFailed"), {
          position: "top-right",
        });
      }
    };
    try {
      if (review) {
        await review.onSubmit(matchData);
      } else if (current) {
        await updateMatchMutation({
          matchId: current._id,
          ...matchData,
        });

        await cacheSavedName(current._id);

        toast.success(t("tools.pvp.toasts.matchUpdated"), {
          position: "top-right",
        });
      } else {
        const savedMatchId = await recordMatchMutation({
          seasonId,
          ...matchData,
        });

        await cacheSavedName(savedMatchId);

        rememberDate(date);

        toast.success(t("tools.pvp.toasts.matchRecorded"), {
          position: "top-right",
        });
        router.push(`/pvp/${seasonId}`);
      }
    } catch (err) {
      setSaveError(true);
      console.error(err);
      toast.error(t("tools.pvp.toasts.matchSaveFail"), {
        position: "top-right",
      });
    } finally {
      saveInFlight.current = false;
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (review && reviewInitialized.current) {
      return;
    }

    if (review) {
      reviewInitialized.current = true;
    }

    nameReceiptRef.current = undefined;
    nameCacheEligibleRef.current = false;
    setNameUncertain(false);

    const initial = review?.initial ?? current;
    if (!initial) {
      return;
    }

    setNameUncertain(review?.nameUncertain ?? false);
    setDate(new Date(initial.date));
    setOwnRank(initial.ownRank);
    setOwnRankStr(initial.ownRank?.toString() ?? "");
    setOpponentName(initial.opponentName ?? "");
    setEnemyPresetId(initial.enemyPresetId);
    setOpponentRank(initial.opponentRank);
    setOpponentRankStr(initial.opponentRank?.toString() ?? "");

    if (initial.opponentStudentRepId) {
      const student = studentMap[initial.opponentStudentRepId];
      if (student) {
        setOpponentStudentRep(student);
      }
    }

    setMatchType(initial.matchType);

    setOwnTeam(
      initial.ownTeam.map((item) => ({
        student: item.studentId ? studentMap[item.studentId] : undefined,
        level: item.level,
        starLevel: item.starLevel,
        ueLevel: item.ueLevel,
        damage: item.damage,
      })),
    );

    setOpponentTeam(
      initial.opponentTeam.map((item) => ({
        student: item.studentId ? studentMap[item.studentId] : undefined,
        level: item.level,
        starLevel: item.starLevel,
        ueLevel: item.ueLevel,
        damage: item.damage,
      })),
    );

    setResult(initial.result);
    setVideoUrl(initial.videoUrl ?? "");
    setIncludeInStatistics(initial.includeInStatistics ?? false);
  }, [current, review, studentMap]);

  if (!defaults) {
    return <MessageBox>{t("common.loading")}</MessageBox>;
  }

  if (!review && !defaults.season?.seasonNumber) {
    return (
      <MessageBox className="flex flex-col items-start gap-4">
        <p>{t("tools.pvp.season.assignSeasonNumber")}</p>

        <Button variant="outline" asChild>
          <Link href={`/pvp/${seasonId}`}>
            {t("common.backTo", { destination: t("tools.pvp.title") })}
          </Link>
        </Button>
      </MessageBox>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {!review && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 items-center">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/pvp/${seasonId}`}>
                <ChevronLeftIcon />
              </Link>
            </Button>

            <h1 className="text-xl font-bold">
              {current
                ? t("tools.pvp.match.editMatch")
                : t("tools.pvp.match.recordNewMatch")}
            </h1>

            {!current && (
              <Button
                type="button"
                variant="outline"
                onClick={() => changeReportDialog(true)}
              >
                {t("tools.pvp.reportImport.title")}
              </Button>
            )}
          </div>
        </div>
      )}

      <Dialog open={reportDialogOpen} onOpenChange={changeReportDialog}>
        <DialogContent onPaste={handleCombatReportPaste}>
          <DialogHeader>
            <DialogTitle>{t("tools.pvp.reportImport.title")}</DialogTitle>
            <DialogDescription>
              {t.rich("tools.pvp.reportImport.disclaimer", {
                shortcut: (children) => <Kbd>{children}</Kbd>,
              })}
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <TriangleAlertIcon aria-hidden="true" />
            <AlertDescription>
              {t("tools.pvp.screenshotImport.extractionNotice")}
            </AlertDescription>
          </Alert>

          <button
            type="button"
            className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center text-sm text-muted-foreground hover:bg-muted/50"
            onClick={() => reportInputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files[0];
              if (file) void handleCombatReport(file);
            }}
            disabled={reportStatus !== "idle"}
          >
            {reportStatus === "idle" && (
              <>
                <span className="font-medium text-foreground">
                  {t("tools.pvp.reportImport.drop")}
                </span>

                <span>{t("tools.pvp.reportImport.browse")}</span>

                <span className="mt-2 flex items-center gap-1.5 text-xs">
                  {t("tools.pvp.reportImport.pasteHint")}
                  <Kbd>Ctrl/Cmd + V</Kbd>
                </span>
              </>
            )}

            {reportStatus === "reading" && t("tools.pvp.reportImport.reading")}

            {reportStatus === "extracting" &&
              t("tools.pvp.reportImport.extracting")}

            {reportStatus === "applying" &&
              t("tools.pvp.reportImport.applying")}
          </button>

          <input
            ref={reportInputRef}
            type="file"
            accept={PVP_SCREENSHOT_INPUT_TYPES.join(",")}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleCombatReport(file);
              event.target.value = "";
            }}
          />

          <output
            aria-atomic="true"
            className={`flex min-h-5 items-center gap-2 text-sm font-bold ${
              reportImportState === "ready"
                ? "text-green-600 dark:text-green-400"
                : reportImportState === "failed"
                  ? "text-destructive"
                  : "text-muted-foreground"
            }`}
          >
            {reportImportState === "ready" ? (
              <CheckIcon
                className="size-4 shrink-0"
                strokeWidth={3}
                aria-hidden
              />
            ) : reportImportState === "failed" ? (
              <TriangleAlertIcon
                className="size-4 shrink-0 text-destructive"
                aria-hidden
              />
            ) : (
              <LoaderCircleIcon
                className="size-4 shrink-0 animate-spin"
                aria-hidden
              />
            )}
            <span>
              {reportImportState === "ready"
                ? t("tools.pvp.reportImport.engineReady")
                : reportImportState === "failed"
                  ? t("tools.pvp.reportImport.engineFailed")
                  : reportImportState === "extracting"
                    ? t("tools.pvp.reportImport.extractionInProgress")
                    : t("tools.pvp.reportImport.loadingAssets")}
            </span>
          </output>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => changeReportDialog(false)}
            >
              {t("tools.pvp.reportImport.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={savePresetDialogOpen}
        onOpenChange={setSavePresetDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("tools.pvp.presets.saveFormationTitle")}
            </DialogTitle>

            <DialogDescription>
              {t("tools.pvp.presets.saveFormationDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="save-pvp-preset-name">
                {t("tools.pvp.presets.formationName")}
              </Label>

              <Input
                id="save-pvp-preset-name"
                value={savePresetName}
                onChange={(event) => setSavePresetName(event.target.value)}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="save-pvp-preset-type">
                  {t("tools.pvp.presets.formationType")}
                </Label>

                <Select
                  value={savePresetMatchType}
                  onValueChange={(value) =>
                    setSavePresetMatchType(value as PVPFormationPresetType)
                  }
                >
                  <SelectTrigger id="save-pvp-preset-type">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="attack">
                      {t("tools.pvp.presets.attack")}
                    </SelectItem>

                    <SelectItem value="defense">
                      {t("tools.pvp.presets.defense")}
                    </SelectItem>

                    <SelectItem value="both">
                      {t("tools.pvp.presets.both")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="save-pvp-preset-used-by-me"
                  checked={savePresetUsedByMe}
                  onCheckedChange={setSavePresetUsedByMe}
                />

                <Label htmlFor="save-pvp-preset-used-by-me">
                  {t("tools.pvp.presets.usedByMe")}
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSavePresetDialogOpen(false)}
            >
              {t("tools.pvp.reportImport.cancel")}
            </Button>

            <Button
              type="button"
              disabled={!savePresetName.trim()}
              onClick={() => void saveFormationPreset()}
            >
              {t("tools.pvp.presets.savePreset")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={saveEnemyPresetDialogOpen}
        onOpenChange={setSaveEnemyPresetDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tools.pvp.presets.saveEnemyTitle")}</DialogTitle>
            <DialogDescription>
              {t("tools.pvp.presets.saveEnemyDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="save-enemy-preset-name">
              {t("tools.pvp.presets.enemyName")}
            </Label>

            <Input
              id="save-enemy-preset-name"
              value={saveEnemyPresetName}
              onChange={(event) => setSaveEnemyPresetName(event.target.value)}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveEnemyPresetDialogOpen(false)}
            >
              {t("tools.pvp.presets.cancel")}
            </Button>

            <Button
              disabled={!saveEnemyPresetName.trim()}
              onClick={() => void saveOpponentPreset()}
            >
              {t("tools.pvp.presets.savePreset")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <PvpMatchDatePicker
          value={matchDate}
          editing={!!current || !!review}
          disabled={!!review}
        />

        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("tools.pvp.match.videoUrl")}</Label>

          <Input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder={t("tools.pvp.presets.videoPlaceholder")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("tools.pvp.match.matchType")}</Label>

          <Select
            value={matchType}
            onValueChange={(value) => {
              setMatchType(value as PVPMatchType);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="attack">
                {t("tools.pvp.match.attack")}
              </SelectItem>

              <SelectItem value="defense">
                {t("tools.pvp.match.defense")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("tools.pvp.match.result")}</Label>

          <Select
            value={result}
            onValueChange={(value) => {
              setResult(value as PVPMatchResult);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="win">{t("tools.pvp.match.win")}</SelectItem>
              <SelectItem value="loss">{t("tools.pvp.match.loss")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!review && (
        <div className="flex flex-col gap-2 -mt-4">
          <div className="flex items-center gap-2">
            <Switch
              id="pvp-include-statistics"
              checked={includeInStatistics}
              disabled={
                !hasValidStatisticsTeams || !defaults?.season?.seasonNumber
              }
              onCheckedChange={(checked) => {
                statisticsPreferenceTouched.current = true;
                setIncludeInStatistics(checked);
              }}
            />

            <Label htmlFor="pvp-include-statistics">
              {t("tools.pvp.match.includeInStatistics")}
            </Label>
          </div>

          <p className="text-sm text-muted-foreground">
            {t("tools.pvp.match.includeInStatisticsHint")}
          </p>

          <p className="text-xs text-muted-foreground">
            {t("tools.pvp.match.includeInStatisticsPreferenceHint")}
          </p>
        </div>
      )}

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex min-h-14 items-center">
            <CardTitle>{t("tools.pvp.match.you")}</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-1">
                <Label htmlFor="own-rank" className="text-xs">
                  {t("tools.pvp.match.yourRank")}
                </Label>

                <Input
                  id="own-rank"
                  type="number"
                  min={1}
                  value={ownRankStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOwnRankStr(val);

                    if (val === "") {
                      setOwnRank(undefined);
                      return;
                    }

                    const num = Number.parseInt(val, 10);
                    if (!Number.isNaN(num)) {
                      setOwnRank(num);
                    } else {
                      setOwnRank(undefined);
                    }
                  }}
                />
              </div>
            </div>

            <Separator />

            <PVPPresetPicker
              presets={formationPresets
                ?.slice()
                .filter(
                  (preset) =>
                    !preset.matchType ||
                    preset.matchType === "both" ||
                    preset.matchType === matchType,
                )
                .sort((a, b) => Number(b.usedByMe) - Number(a.usedByMe))}
              placeholder={t("tools.pvp.presetPicker.autofill")}
              studentMap={studentMap}
              search={ownFormationSearch}
              onSearchChange={setOwnFormationSearch}
              onSelect={(value) => applyFormationPreset("own", value)}
            />

            <PVPMatchFormationEditor
              formation={ownTeam}
              onUpdate={handleOwnItemUpdate}
              onMove={(from, to) => handleItemMove("own", from, to)}
              strikerPrefix={matchType === "attack" ? "A" : "D"}
            />

            <Button
              type="button"
              variant="outline"
              onClick={() => openSavePresetDialog("own")}
            >
              Save as Preset
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex min-h-14 flex-row items-center justify-between">
            <CardTitle>{t("tools.pvp.match.opponent")}</CardTitle>

            <PVPPresetPicker
              presets={enemyPresets}
              placeholder={
                selectedEnemyPreset?.name ??
                t("tools.pvp.presetPicker.attachEnemy")
              }
              className="w-1/2 min-w-44"
              studentMap={studentMap}
              search={enemyPresetSearch}
              onSearchChange={setEnemyPresetSearch}
              paginationStatus={enemyPresetStatus}
              loadMore={loadMoreEnemyPresets}
              onSelect={(value) => {
                setEnemyPresetId(value as Id<"pvpEnemyPreset">);

                const preset =
                  value === selectedEnemyPreset?._id
                    ? selectedEnemyPreset
                    : enemyPresets.find((item) => item._id === value);

                if (!preset) {
                  return;
                }

                setOpponentName(preset.opponentName ?? "");
                nameCacheEligibleRef.current = true;
                setNameUncertain(false);
                setOpponentStudentRep(
                  preset.opponentStudentRepId
                    ? studentMap[preset.opponentStudentRepId]
                    : undefined,
                );

                if (
                  !opponentTeam.some((item) => item.student) &&
                  preset.latestTeam
                ) {
                  setOpponentTeam(
                    (preset.latestTeam as PVPEnemyTeam["team"]).map((item) => ({
                      student: item.studentId
                        ? studentMap[item.studentId]
                        : undefined,
                      level: item.level,
                      starLevel: item.starLevel,
                      ueLevel: item.ueLevel,
                    })),
                  );
                }
              }}
            />
          </CardHeader>

          <CardContent className="flex flex-col gap-6">
            <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
              <div className="flex min-w-0 flex-col gap-1">
                <Label htmlFor="opponent-name" className="text-xs">
                  {t("tools.pvp.match.opponentName")}
                </Label>

                <Input
                  id="opponent-name"
                  value={opponentName}
                  aria-invalid={nameUncertain}
                  aria-describedby={
                    nameUncertain ? "opponent-name-hint" : undefined
                  }
                  onChange={(e) => {
                    setOpponentName(e.target.value);
                    nameCacheEligibleRef.current = true;
                    setNameUncertain(false);
                  }}
                />

                {nameUncertain && (
                  <p
                    id="opponent-name-hint"
                    className="text-xs text-muted-foreground"
                  >
                    {t("tools.pvp.reportImport.nameUncertain")}
                  </p>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                <Label htmlFor="opponent-rank" className="text-xs">
                  {t("tools.pvp.match.opponentRank")}
                </Label>

                <Input
                  id="opponent-rank"
                  type="number"
                  min={1}
                  value={opponentRankStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOpponentRankStr(val);

                    if (val === "") {
                      setOpponentRank(undefined);
                      return;
                    }

                    const num = Number.parseInt(val, 10);
                    if (!Number.isNaN(num)) {
                      setOpponentRank(num);
                    } else {
                      setOpponentRank(undefined);
                    }
                  }}
                />
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                <Label htmlFor="opponent-student-rep" className="text-xs">
                  {t("tools.pvp.match.opponentStudentRep")}
                </Label>

                <div className="flex min-w-0 gap-1">
                  <StudentPicker onStudentSelected={setOpponentStudentRep}>
                    <Button
                      variant="outline"
                      className="min-w-0 flex-1 justify-between"
                    >
                      <span className="truncate">
                        {opponentStudentRep
                          ? opponentStudentRep.name
                          : t("common.selectStudent")}
                      </span>
                      <ChevronDownIcon className="shrink-0" />
                    </Button>
                  </StudentPicker>

                  {opponentStudentRep && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setOpponentStudentRep(undefined)}
                    >
                      <XIcon />
                    </Button>
                  )}
                </div>
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={!canSaveOpponent}
                        aria-label={t("tools.pvp.presets.saveEnemy")}
                        onClick={() => {
                          setSaveEnemyPresetName(
                            attachedOpponentPreset?.name || opponentName,
                          );
                          setSaveEnemyPresetDialogOpen(true);
                        }}
                      >
                        <SaveIcon />
                      </Button>
                    </span>
                  </TooltipTrigger>

                  <TooltipContent>
                    {t("tools.pvp.presets.saveEnemyTooltip")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Separator />

            {enemyPresetId && enemyTeams && enemyTeams.teams.length > 0 && (
              <Select
                onValueChange={(value) => {
                  const selected = (enemyTeams.teams as PVPEnemyTeam[]).find(
                    (item) => item.teamKey === value,
                  );

                  if (selected) {
                    setOpponentTeam(
                      selected.team.map((item) => ({
                        student: item.studentId
                          ? studentMap[item.studentId]
                          : undefined,
                        level: item.level,
                        starLevel: item.starLevel,
                        ueLevel: item.ueLevel,
                      })),
                    );
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("tools.pvp.presets.selectKnownTeam")}
                  />
                </SelectTrigger>

                <SelectContent>
                  {(enemyTeams.teams as PVPEnemyTeam[]).map((item) => (
                    <SelectItem key={item.teamKey} value={item.teamKey}>
                      {item.roles === "both"
                        ? `${t("tools.pvp.presets.attack")} / ${t("tools.pvp.presets.defense")}`
                        : item.roles === "attack"
                          ? t("tools.pvp.presets.attack")
                          : t("tools.pvp.presets.defense")}{" "}
                      —{" "}
                      {item.team
                        .filter((slot) => slot.studentId)
                        .map((slot) =>
                          slot.studentId
                            ? studentMap[slot.studentId]?.name
                            : "",
                        )
                        .filter(Boolean)
                        .join(", ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <PVPPresetPicker
              presets={enemyFormationPresets?.filter(
                (preset) =>
                  !preset.matchType ||
                  preset.matchType === "both" ||
                  preset.matchType ===
                    (matchType === "attack" ? "defense" : "attack"),
              )}
              placeholder={t("tools.pvp.presetPicker.autofill")}
              studentMap={studentMap}
              search={enemyFormationSearch}
              onSearchChange={setEnemyFormationSearch}
              onSelect={(value) => applyFormationPreset("enemy", value)}
            />

            <PVPMatchFormationEditor
              formation={opponentTeam}
              onUpdate={handleOpponentItemUpdate}
              onMove={(from, to) => handleItemMove("enemy", from, to)}
              strikerPrefix={matchType === "defense" ? "A" : "D"}
            />

            <Button
              type="button"
              variant="outline"
              onClick={() => openSavePresetDialog("enemy")}
            >
              Save as Preset
            </Button>
          </CardContent>
        </Card>
      </div>

      {saveError && (
        <Alert variant="destructive">
          <AlertDescription>
            {t("tools.pvp.toasts.matchSaveFail")}
          </AlertDescription>
        </Alert>
      )}

      {review && (
        <div className="sticky -bottom-6 -mx-6 -mb-6 flex flex-wrap justify-end gap-2 border-t bg-background px-6 py-4">
          <Button variant="outline" disabled={isSaving} onClick={review.onStop}>
            {t("tools.pvp.screenshotImport.stop")}
          </Button>

          <Button
            variant="outline"
            disabled={isSaving || review.pending}
            onClick={review.onSkip}
          >
            {t("tools.pvp.screenshotImport.skip")}
          </Button>

          <Button
            disabled={isSaving || review.pending}
            onClick={handleWantsToUpdate}
          >
            {isSaving
              ? t("common.saving")
              : review.pending
                ? t("common.loading")
                : t(
                    review.final
                      ? "tools.pvp.screenshotImport.saveAndFinish"
                      : "tools.pvp.screenshotImport.saveAndNext",
                  )}
          </Button>
        </div>
      )}

      {!review && (
        <Button
          className="fixed bottom-4 right-4 z-50"
          onClick={handleWantsToUpdate}
          disabled={isSaving}
        >
          <SaveIcon />
          {isSaving ? t("common.saving") : t("common.saveChanges")}
        </Button>
      )}
    </div>
  );
}
