"use client";

import { PVPMatchFormationEditor } from "@/app/[locale]/pvp/_components/pvp-match-formation-editor";
import type {
  PVPEnemyTeam,
  PVPFormationPresetType,
  PVPFormationStudentItem,
} from "@/app/[locale]/pvp/_lib/types";
import { MessageBox } from "@/components/common/message-box";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStudents } from "@/hooks/use-students";
import { Link } from "@/i18n/navigation";
import { buildPvpCounterSearchHref } from "@/lib/pvp-counter-link";
import { Storage } from "@/lib/storage";
import { buildStudentPortraitUrl } from "@/lib/url";
import { useMutation, useQuery } from "convex/react";
import { ChevronLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

const teamFilterStorage = new Storage<PVPFormationPresetType>(
  "pvp_enemy_team_filter_v1",
);

export function PVPEnemyPresetTeamsPage({
  seasonId,
  presetId,
}: {
  seasonId: Id<"pvpSeason">;
  presetId: Id<"pvpEnemyPreset">;
}) {
  const t = useTranslations();
  const teamsResult = useQuery(api.pvp.getEnemyPresetTeams, { presetId });
  const seasonResult = useQuery(api.pvp.getSeasonDefaults, { seasonId });
  const createTeam = useMutation(api.pvp.createEnemyTeam);
  const updateTeam = useMutation(api.pvp.updateEnemyTeam);
  const deleteTeam = useMutation(api.pvp.deleteEnemyTeam);
  const { studentMap } = useStudents();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<Id<"pvpEnemyTeam">>();
  const [team, setTeam] = useState<PVPFormationStudentItem[]>([
    {},
    {},
    {},
    {},
    {},
    {},
  ]);
  const [matchType, setMatchType] = useState<PVPFormationPresetType>("both");
  const [advanced, setAdvanced] = useState(false);
  const [teamFilter, setTeamFilter] = useState<PVPFormationPresetType>("both");

  useEffect(() => {
    try {
      const saved = teamFilterStorage.get();

      if (saved === "both" || saved === "attack" || saved === "defense") {
        setTeamFilter(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  function handleTeamFilterChange(value: string) {
    if (value !== "both" && value !== "attack" && value !== "defense") {
      return;
    }

    const nextFilter = value as PVPFormationPresetType;
    setTeamFilter(nextFilter);

    try {
      teamFilterStorage.set(nextFilter);
    } catch {
      // ignore
    }
  }

  function openTeamDialog(item?: PVPEnemyTeam) {
    setEditingTeamId(item?.manualTeamId as Id<"pvpEnemyTeam"> | undefined);
    setMatchType(item?.roles ?? "both");
    setTeam(
      item
        ? item.team.map((slot) => ({
            student: slot.studentId ? studentMap[slot.studentId] : undefined,
            level: slot.level,
            starLevel: slot.starLevel,
            ueLevel: slot.ueLevel,
          }))
        : [{}, {}, {}, {}, {}, {}],
    );
    setDialogOpen(true);
  }

  async function saveTeam() {
    const persisted = team.map((slot) => ({
      studentId: slot.student?.id,
      level: slot.level,
      starLevel: slot.starLevel,
      ueLevel: slot.ueLevel,
    }));
    if (!teamsResult) return;
    if (editingTeamId) {
      await updateTeam({
        teamId: editingTeamId as Id<"pvpEnemyTeam">,
        team: persisted,
        matchType,
      });
    } else {
      await createTeam({
        seasonId,
        enemyPresetId: presetId,
        team: persisted,
        matchType,
      });
    }
    setDialogOpen(false);
  }

  if (!teamsResult) {
    return <MessageBox>{t("tools.pvp.presets.loadingTeams")}</MessageBox>;
  }

  const filteredTeams = teamsResult.teams.filter(
    (knownTeam) =>
      teamFilter === "both" ||
      knownTeam.roles === teamFilter ||
      knownTeam.roles === "both",
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/pvp/${seasonId}/presets/opponents`}>
            <ChevronLeftIcon />
          </Link>
        </Button>

        <h1 className="text-xl font-bold">
          {t("tools.pvp.presets.teamsUsedBy", {
            name: teamsResult?.preset.name ?? "",
          })}
        </h1>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" asChild>
            <Link
              href={`/pvp/${seasonId}/presets/opponents/${presetId}/history`}
            >
              {t("tools.pvp.presets.battleHistory")}
            </Link>
          </Button>
          <Button onClick={() => openTeamDialog()}>
            {t("tools.pvp.presets.addTeam")}
          </Button>
        </div>
      </div>

      <div className="flex w-full max-w-sm items-center gap-3">
        <Label htmlFor="enemy-formation-type-filter">
          {t("tools.pvp.presets.filterFormationType")}
        </Label>

        <Select value={teamFilter} onValueChange={handleTeamFilterChange}>
          <SelectTrigger id="enemy-formation-type-filter" className="flex-1">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="both">{t("tools.pvp.presets.both")}</SelectItem>

            <SelectItem value="attack">
              {t("tools.pvp.presets.attack")}
            </SelectItem>

            <SelectItem value="defense">
              {t("tools.pvp.presets.defense")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {teamsResult.teams.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          {t("tools.pvp.presets.noTeams")}
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          {t("tools.pvp.presets.noTeamsForFilter")}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredTeams.map((knownTeam) => (
            <article
              className="flex min-w-0 flex-wrap items-center gap-3 rounded-lg border p-4"
              key={knownTeam.teamKey}
            >
              <div className="flex w-28 flex-col gap-1 text-sm text-muted-foreground">
                <span>
                  {new Date(knownTeam.updatedAt).toLocaleDateString()}
                </span>
                <span className="flex flex-wrap gap-1">
                  {(knownTeam.roles === "attack" ||
                    knownTeam.roles === "both") && (
                    <Badge variant="outline">
                      {t("tools.pvp.presets.attack")}
                    </Badge>
                  )}
                  {(knownTeam.roles === "defense" ||
                    knownTeam.roles === "both") && (
                    <Badge variant="outline">
                      {t("tools.pvp.presets.defense")}
                    </Badge>
                  )}
                </span>
              </div>

              {knownTeam.team.map(
                (item: PVPEnemyTeam["team"][number], index: number) => {
                  const student = item.studentId
                    ? studentMap[item.studentId]
                    : undefined;

                  return student ? (
                    <img
                      key={`${knownTeam.teamKey}-${index}`}
                      src={buildStudentPortraitUrl(student)}
                      alt={student.name}
                      title={student.name}
                      className="size-14 rounded object-cover"
                    />
                  ) : (
                    <div
                      key={`${knownTeam.teamKey}-${index}`}
                      className="size-14 rounded border border-dashed"
                    />
                  );
                },
              )}
              <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
                <Badge variant="secondary" className="gap-3">
                  {t.rich("tools.pvp.presets.encounters", {
                    ...knownTeam.encounterCounts,
                    stat: (children) => <span>{children}</span>,
                    muted: (children) => (
                      <span className="text-muted-foreground mx-0.5">
                        {children}
                      </span>
                    ),
                  })}
                </Badge>

                <div className="flex flex-wrap justify-end gap-2">
                  {(knownTeam.roles === "defense" ||
                    knownTeam.roles === "both") &&
                    seasonResult?.season?.seasonNumber && (
                      <Button size="sm" variant="outline" asChild>
                        <Link
                          href={buildPvpCounterSearchHref({
                            seasonNumber: seasonResult.season.seasonNumber,
                            defenseTeam: knownTeam.team,
                          })}
                        >
                          {t("tools.pvp.presets.findCounters")}
                        </Link>
                      </Button>
                    )}
                  {knownTeam.manualTeamId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openTeamDialog(knownTeam as PVPEnemyTeam)}
                    >
                      {t("tools.pvp.presets.edit")}
                    </Button>
                  )}
                  {knownTeam.manualTeamId && (
                    <ConfirmDialog
                      title={t("tools.pvp.presets.deleteTeamTitle")}
                      description={t("tools.pvp.presets.deleteTeamDescription")}
                      confirmVariant="destructive"
                      onConfirm={() =>
                        deleteTeam({
                          teamId: knownTeam.manualTeamId as Id<"pvpEnemyTeam">,
                        })
                      }
                    >
                      <Button size="sm" variant="destructive">
                        {t("tools.pvp.presets.delete")}
                      </Button>
                    </ConfirmDialog>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTeamId
                ? t("tools.pvp.presets.editTeam")
                : t("tools.pvp.presets.addTeam")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label>{t("tools.pvp.presets.formationType")}</Label>
              <Select
                value={matchType}
                onValueChange={(value) =>
                  setMatchType(value as PVPFormationPresetType)
                }
              >
                <SelectTrigger>
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
            <PVPMatchFormationEditor
              formation={team}
              onUpdate={(index, value) =>
                setTeam((current) =>
                  current.map((slot, slotIndex) =>
                    slotIndex === index ? { ...slot, ...value } : slot,
                  ),
                )
              }
              advanced={advanced}
              onAdvancedChange={setAdvanced}
              showDamage={false}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("tools.pvp.presets.cancel")}
            </Button>
            <Button
              disabled={!team.some((slot) => slot.student)}
              onClick={() => void saveTeam()}
            >
              {t("tools.pvp.presets.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
