"use client";

import { parsePvpCombatReport } from "@/actions/pvp-combat-report";
import { PVPMatchFormationEditor } from "@/app/pvp/_components/pvp-match-formation-editor";
import { PVPPresetPicker } from "@/app/pvp/_components/pvp-preset-picker";
import type {
  PVPFormationStudentItem,
  PVPMatchResult,
  PVPMatchType,
} from "@/app/pvp/_lib/types";
import { StudentPicker } from "@/components/common/student-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useDebounce } from "@/hooks/use-debounce";
import { useStudents } from "@/hooks/use-students";
import { orderStudentsByFuzzyNameQuery } from "@/lib/student-search-query";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";
import type { Doc, Id } from "~convex/dataModel";
import type { Student } from "~prisma";

export type PVPMatchEditor = {
  seasonId: Id<"pvpSeason">;
  current?: Doc<"pvpMatchRecord">;
};

export function PVPMatchEditor({ seasonId, current }: PVPMatchEditor) {
  const t = useTranslations();
  const { studentMap } = useStudents();

  const router = useRouter();

  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const [date, setDate] = useState<Date>(new Date());
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
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [ownAdvanced, setOwnAdvanced] = useState(false);
  const [opponentAdvanced, setOpponentAdvanced] = useState(false);
  const [enemyPresetId, setEnemyPresetId] = useState<Id<"pvpEnemyPreset">>();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportStatus, setReportStatus] = useState<
    "idle" | "reading" | "extracting" | "applying"
  >("idle");
  const reportInputRef = useRef<HTMLInputElement>(null);
  const [savePresetKind, setSavePresetKind] = useState<"own" | "enemy">("own");
  const [savePresetName, setSavePresetName] = useState("");
  const [savePresetUsedByMe, setSavePresetUsedByMe] = useState(true);
  const [savePresetDialogOpen, setSavePresetDialogOpen] = useState(false);
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
  const enemyPresets = useQuery(api.pvp.listEnemyPresets, {
    seasonId,
    search: useDebounce(enemyPresetSearch, 250),
  });
  const defaults = useQuery(
    api.pvp.getSeasonDefaults,
    current ? "skip" : { seasonId },
  );
  const createFormationPreset = useMutation(api.pvp.createFormationPreset);

  const [isSaving, setIsSaving] = useState(false);

  const handleItemUpdate = useCallback(
    (
      kind: "own" | "enemy",
      idx: number,
      params: Partial<PVPFormationStudentItem>,
    ) => {
      const targetTeam = kind === "own" ? ownTeam : opponentTeam;
      const updatedItem = {
        ...targetTeam[idx],
        ...params,
      };

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

  const handleItemMoveUp = useCallback(
    (kind: "own" | "enemy", idx: number) => {
      const targetTeam = kind === "own" ? ownTeam : opponentTeam;
      if (idx <= 0 || idx >= targetTeam.length) {
        return;
      }

      const updatedTeam = [...targetTeam];
      const temp = updatedTeam[idx - 1];
      updatedTeam[idx - 1] = updatedTeam[idx];
      updatedTeam[idx] = temp;

      if (kind === "own") {
        setOwnTeam(updatedTeam);
      } else {
        setOpponentTeam(updatedTeam);
      }
    },
    [ownTeam, opponentTeam],
  );

  const handleItemMoveDown = useCallback(
    (kind: "own" | "enemy", idx: number) => {
      const targetTeam = kind === "own" ? ownTeam : opponentTeam;
      if (idx < 0 || idx >= targetTeam.length - 1) {
        return;
      }

      const updatedTeam = [...targetTeam];
      const temp = updatedTeam[idx + 1];
      updatedTeam[idx + 1] = updatedTeam[idx];
      updatedTeam[idx] = temp;

      if (kind === "own") {
        setOwnTeam(updatedTeam);
      } else {
        setOpponentTeam(updatedTeam);
      }
    },
    [ownTeam, opponentTeam],
  );

  const handleOwnItemMoveUp = useCallback(
    (idx: number) => {
      handleItemMoveUp("own", idx);
    },
    [handleItemMoveUp],
  );

  const handleOwnItemMoveDown = useCallback(
    (idx: number) => {
      handleItemMoveDown("own", idx);
    },
    [handleItemMoveDown],
  );

  const handleOpponentItemMoveUp = useCallback(
    (idx: number) => {
      handleItemMoveUp("enemy", idx);
    },
    [handleItemMoveUp],
  );

  const handleOpponentItemMoveDown = useCallback(
    (idx: number) => {
      handleItemMoveDown("enemy", idx);
    },
    [handleItemMoveDown],
  );

  useEffect(() => {
    if (current || !defaults) {
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
  }, [current, defaults, studentMap]);

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
      matchType,
      usedByMe: savePresetUsedByMe,
      team: team.map((item) => ({
        studentId: item.student?.id,
        level: item.level,
        starLevel: item.starLevel,
        ueLevel: item.ueLevel,
      })),
    });

    setSavePresetDialogOpen(false);
    toast.success("Formation preset saved.");
  }

  async function handleCombatReport(file: File) {
    try {
      setReportStatus("reading");

      const form = new FormData();
      form.set("screenshot", file);

      setReportStatus("extracting");

      const parsed = await parsePvpCombatReport(form);

      if (!parsed.valid) {
        toast.error("This is not a valid PVP combat report.");
        return;
      }

      setReportStatus("applying");

      const resolve = (name: string) => {
        return orderStudentsByFuzzyNameQuery(Object.values(studentMap), name)
          .ordered[0];
      };

      const team = (units: typeof parsed.battle.myUnits) => {
        const next = [{}, {}, {}, {}, {}, {}] as PVPFormationStudentItem[];

        let striker = 0;
        let special = 4;

        for (const unit of units) {
          const student = resolve(unit.student);

          if (!student) {
            continue;
          }

          const index = student.combatClass === "Main" ? striker++ : special++;

          if (index < 6) {
            next[index] = { student, damage: unit.damage };
          }
        }

        return next;
      };

      setMatchType(parsed.battle.battleType.toLowerCase() as PVPMatchType);
      setResult(parsed.battle.result === "WIN" ? "win" : "loss");
      setOpponentName(parsed.battle.enemyName ?? "");
      setOwnTeam(team(parsed.battle.myUnits));
      setOpponentTeam(team(parsed.battle.enemyUnits));

      if (parsed.battle.enemyName) {
        const preset = enemyPresets?.find(
          (candidate) => candidate.opponentName === parsed.battle.enemyName,
        );

        if (preset) {
          setEnemyPresetId(preset._id);
          setOpponentStudentRep(
            preset.opponentStudentRepId
              ? studentMap[preset.opponentStudentRepId]
              : undefined,
          );
        }
      }

      toast.success("Combat report imported. Review the match before saving.");
      setReportDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to import combat report.");
    } finally {
      setReportStatus("idle");
    }
  }

  async function handleWantsToUpdate() {
    setIsSaving(true);

    const matchData = {
      date: date.getTime(),
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
    };

    try {
      if (current) {
        await updateMatchMutation({
          matchId: current._id,
          ...matchData,
        });

        toast.success(t("tools.pvp.toasts.matchUpdated"));
      } else {
        await recordMatchMutation({
          seasonId,
          ...matchData,
        });

        toast.success(t("tools.pvp.toasts.matchRecorded"));
        router.push(`/pvp/${seasonId}`);
      }
    } catch (err) {
      console.error(err);
      toast.error(t("tools.pvp.toasts.matchSaveFail"));
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (!current) {
      return;
    }

    setDate(new Date(current.date));
    setOwnRank(current.ownRank);
    setOwnRankStr(current.ownRank?.toString() ?? "");
    setOpponentName(current.opponentName ?? "");
    setEnemyPresetId(current.enemyPresetId);
    setOpponentRank(current.opponentRank);
    setOpponentRankStr(current.opponentRank?.toString() ?? "");

    if (current.opponentStudentRepId) {
      const student = studentMap[current.opponentStudentRepId];
      if (student) {
        setOpponentStudentRep(student);
      }
    }

    setMatchType(current.matchType);

    setOwnTeam(
      current.ownTeam.map((item) => ({
        student: item.studentId ? studentMap[item.studentId] : undefined,
        level: item.level,
        starLevel: item.starLevel,
        ueLevel: item.ueLevel,
        damage: item.damage,
      })),
    );

    setOpponentTeam(
      current.opponentTeam.map((item) => ({
        student: item.studentId ? studentMap[item.studentId] : undefined,
        level: item.level,
        starLevel: item.starLevel,
        ueLevel: item.ueLevel,
        damage: item.damage,
      })),
    );

    setResult(current.result);
    setVideoUrl(current.videoUrl ?? "");
  }, [current, studentMap]);

  return (
    <div className="flex flex-col gap-10">
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
              onClick={() => setReportDialogOpen(true)}
            >
              Import Combat Report
            </Button>
          )}
        </div>
      </div>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Combat Report</DialogTitle>
            <DialogDescription>
              Drop a screenshot here or choose one from your device. The
              extraction may contain mistakes; double-check every field before
              saving the match.
            </DialogDescription>
          </DialogHeader>

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
                  Drop screenshot here
                </span>
                <span>or click to browse</span>
              </>
            )}

            {reportStatus === "reading" && "Reading screenshot..."}

            {reportStatus === "extracting" && "Extracting battle details..."}

            {reportStatus === "applying" &&
              "Matching students and applying results..."}
          </button>

          <input
            ref={reportInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleCombatReport(file);
              event.target.value = "";
            }}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReportDialogOpen(false)}
              disabled={reportStatus !== "idle"}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={savePresetDialogOpen}
        onOpenChange={setSavePresetDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Formation Preset</DialogTitle>
            <DialogDescription>
              Give this formation preset a name and choose whether it should be
              prioritized for your own formations.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="save-pvp-preset-name">Name</Label>

            <Input
              id="save-pvp-preset-name"
              value={savePresetName}
              onChange={(event) => setSavePresetName(event.target.value)}
              autoFocus
            />

            <div className="flex items-center gap-2">
              <Switch
                id="save-pvp-preset-used-by-me"
                checked={savePresetUsedByMe}
                onCheckedChange={setSavePresetUsedByMe}
              />

              <Label htmlFor="save-pvp-preset-used-by-me">Used By Me</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSavePresetDialogOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              disabled={!savePresetName.trim()}
              onClick={() => void saveFormationPreset()}
            >
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="flex flex-col gap-1">
          <Label htmlFor="match-date" className="text-xs">
            {t("tools.pvp.match.date")}
          </Label>

          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id="match-date"
                className="justify-between"
              >
                {date.toLocaleDateString()} <ChevronDownIcon />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              className="w-auto overflow-hidden p-0"
              align="start"
            >
              <Calendar
                mode="single"
                selected={date}
                captionLayout="dropdown"
                onSelect={(date) => {
                  setDate(date ?? new Date());
                  setDatePopoverOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("tools.pvp.match.videoUrl")}</Label>

          <Input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://... (optional)"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs">{t("tools.pvp.match.matchType")}</Label>

          <Select
            value={matchType}
            onValueChange={(value) => setMatchType(value as PVPMatchType)}
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
            onValueChange={(value) => setResult(value as PVPMatchResult)}
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
              placeholder="Autofill from preset"
              studentMap={studentMap}
              search={ownFormationSearch}
              onSearchChange={setOwnFormationSearch}
              onSelect={(value) => applyFormationPreset("own", value)}
            />

            <PVPMatchFormationEditor
              formation={ownTeam}
              onUpdate={handleOwnItemUpdate}
              onMoveUp={handleOwnItemMoveUp}
              onMoveDown={handleOwnItemMoveDown}
              strikerPrefix={matchType === "attack" ? "A" : "D"}
              advanced={ownAdvanced}
              onAdvancedChange={setOwnAdvanced}
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
                enemyPresets?.find((item) => item._id === enemyPresetId)
                  ?.name ?? "Attach enemy preset"
              }
              className="w-1/2 min-w-44"
              studentMap={studentMap}
              search={enemyPresetSearch}
              onSearchChange={setEnemyPresetSearch}
              onSelect={(value) => {
                setEnemyPresetId(value as Id<"pvpEnemyPreset">);

                const preset = enemyPresets?.find((item) => item._id === value);

                if (!preset) {
                  return;
                }

                setOpponentName(preset.opponentName ?? "");
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
                    preset.latestTeam.map((item) => ({
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
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor="opponent-name" className="text-xs">
                  {t("tools.pvp.match.opponentName")}
                </Label>

                <Input
                  id="opponent-name"
                  value={opponentName}
                  onChange={(e) => setOpponentName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
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

              <div className="flex flex-col gap-1">
                <Label htmlFor="opponent-student-rep" className="text-xs">
                  {t("tools.pvp.match.opponentStudentRep")}
                </Label>

                <div className="flex gap-1">
                  <StudentPicker onStudentSelected={setOpponentStudentRep}>
                    <Button
                      variant="outline"
                      className="flex-1 justify-between"
                    >
                      {opponentStudentRep
                        ? opponentStudentRep.name
                        : t("common.selectStudent")}
                      <ChevronDownIcon />
                    </Button>
                  </StudentPicker>

                  {opponentStudentRep && (
                    <Button
                      variant="outline"
                      onClick={() => setOpponentStudentRep(undefined)}
                    >
                      <XIcon />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <Separator />

            <PVPPresetPicker
              presets={enemyFormationPresets?.filter(
                (preset) =>
                  !preset.matchType ||
                  preset.matchType === "both" ||
                  preset.matchType ===
                    (matchType === "attack" ? "defense" : "attack"),
              )}
              placeholder="Autofill from preset"
              studentMap={studentMap}
              search={enemyFormationSearch}
              onSearchChange={setEnemyFormationSearch}
              onSelect={(value) => applyFormationPreset("enemy", value)}
            />

            <PVPMatchFormationEditor
              formation={opponentTeam}
              onUpdate={handleOpponentItemUpdate}
              onMoveUp={handleOpponentItemMoveUp}
              onMoveDown={handleOpponentItemMoveDown}
              strikerPrefix={matchType === "defense" ? "A" : "D"}
              advanced={opponentAdvanced}
              onAdvancedChange={setOpponentAdvanced}
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

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent z-50 p-4 pt-8 flex justify-center">
        <Button onClick={handleWantsToUpdate} disabled={isSaving}>
          <SaveIcon />
          {isSaving ? t("common.saving") : t("common.saveChanges")}
        </Button>
      </div>
    </div>
  );
}
