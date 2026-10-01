"use client";

import { PVPFormation } from "@/app/[locale]/pvp/_components/pvp-formation";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useStudents } from "@/hooks/use-students";
import { Link } from "@/i18n/navigation";
import { buildPvpCounterSearchHref } from "@/lib/pvp-counter-link";
import { useMutation } from "convex/react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";
import type { Doc, Id } from "~convex/dataModel";

export type PVPMatchProps = {
  seasonId: Id<"pvpSeason">;
  match: Doc<"pvpMatchRecord">;
  seasonNumber?: number;
};

export function PVPMatch({ seasonId, match, seasonNumber }: PVPMatchProps) {
  const t = useTranslations();
  const { studentMap } = useStudents();

  const [displayDamageChart, setDisplayDamageChart] = useState(false);

  const deleteMatchMutation = useMutation(api.pvp.deleteMatch);

  const opponentStudentRep = useMemo(() => {
    if (!match.opponentStudentRepId) {
      return null;
    }

    return studentMap[match.opponentStudentRepId] ?? null;
  }, [match.opponentStudentRepId, studentMap]);

  const hasDamageInputs = useMemo(() => {
    return [...match.ownTeam, ...match.opponentTeam].some(
      (item) => typeof item.damage === "number",
    );
  }, [match]);

  const highestDamage = useMemo(() => {
    let maxDamage = 0;

    for (const item of [...match.ownTeam, ...match.opponentTeam]) {
      if (typeof item.damage === "number" && item.damage > maxDamage) {
        maxDamage = item.damage;
      }
    }

    return maxDamage;
  }, [match]);

  const handleToggleDamageChart = useCallback(() => {
    setDisplayDamageChart((prev) => !prev);
  }, []);

  const handleDeleteMatch = useCallback(async () => {
    try {
      await deleteMatchMutation({ matchId: match._id });
      toast.success(t("tools.pvp.match.deleteSuccess"));
    } catch (err) {
      console.error(err);
      toast.error(t("tools.pvp.match.deleteFail"));
    }
  }, [deleteMatchMutation, match._id, t]);

  return (
    <article className="pvp-match-card group relative flex min-w-0 flex-col gap-4 rounded-md border p-6">
      <div className="flex min-w-0 flex-wrap items-start gap-4">
        <div className="@container min-w-0 flex-1 basis-[700px]">
          <div className="flex min-w-0 flex-col items-center gap-6 @min-[900px]:flex-row @min-[900px]:items-start">
            <PVPFormation
              name={t("tools.pvp.match.you")}
              kind={match.matchType}
              rank={match.ownRank}
              result={match.result}
              formation={match.ownTeam}
              damageChartOpen={displayDamageChart}
              highestDamage={highestDamage}
            />

            <div className="text-3xl font-nexon-football-gothic font-bold italic mt-14">
              {t("tools.pvp.match.vs")}
            </div>

            <PVPFormation
              name={match.opponentName ?? t("tools.pvp.match.opponent")}
              kind={match.matchType === "attack" ? "defense" : "attack"}
              rank={match.opponentRank}
              result={match.result === "win" ? "loss" : "win"}
              formation={match.opponentTeam}
              studentRep={opponentStudentRep}
              damageChartOpen={displayDamageChart}
              highestDamage={highestDamage}
            />
          </div>
        </div>

        <div className="pvp-match-actions flex w-full shrink-0 flex-wrap items-center justify-end gap-2">
          {match.matchType === "attack" && seasonNumber && (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={buildPvpCounterSearchHref({
                  seasonNumber: seasonNumber as any,
                  defenseTeam: match.opponentTeam,
                })}
              >
                {t("tools.pvp.presets.findCounters")}
              </Link>
            </Button>
          )}

          {hasDamageInputs && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleDamageChart}
            >
              {displayDamageChart && <ChevronDownIcon />}
              {!displayDamageChart && <ChevronRightIcon />}
              {displayDamageChart
                ? t("tools.pvp.match.hideDamageChart")
                : t("tools.pvp.match.showDamageChart")}
            </Button>
          )}

          <Button variant="outline" size="icon-sm" asChild>
            <Link href={`/pvp/${seasonId}/match/${match._id}`}>
              <PencilIcon />
            </Link>
          </Button>

          <ConfirmDialog
            title={t("tools.pvp.match.deleteTitle")}
            description={t("tools.pvp.match.deleteDescription")}
            confirmVariant="destructive"
            onConfirm={handleDeleteMatch}
          >
            <Button variant="destructive" size="icon-sm">
              <TrashIcon />
            </Button>
          </ConfirmDialog>
        </div>
      </div>
    </article>
  );
}
