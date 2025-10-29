"use client";

import { PVPFormation } from "@/app/pvp/_components/pvp-formation";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useStudents } from "@/hooks/use-students";
import { useMutation } from "convex/react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";
import type { Doc, Id } from "~convex/dataModel";

export type PVPMatchProps = {
  seasonId: Id<"pvpSeason">;
  match: Doc<"pvpMatchRecord">;
};

export function PVPMatch({ seasonId, match }: PVPMatchProps) {
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
      toast.success("PVP match record deleted.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete PVP match record.");
    }
  }, [deleteMatchMutation, match._id]);

  return (
    <article className="flex flex-col gap-4 border rounded-md p-6">
      <div className="flex gap-4 items-start">
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex items-start gap-6">
            <PVPFormation
              name="You"
              kind={match.matchType}
              rank={match.ownRank}
              result={match.result}
              formation={match.ownTeam}
              damageChartOpen={displayDamageChart}
              highestDamage={highestDamage}
            />

            <div className="text-3xl font-nexon-football-gothic font-bold italic mt-14">
              VS
            </div>

            <PVPFormation
              name={match.opponentName ?? "Opponent"}
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

        <div className="shrink-0 flex items-center gap-2">
          {hasDamageInputs && (
            <Button variant="outline" onClick={handleToggleDamageChart}>
              {displayDamageChart && <ChevronDownIcon />}
              {!displayDamageChart && <ChevronRightIcon />}
              {displayDamageChart ? "Hide" : "Show"} Damage Chart
            </Button>
          )}

          <Button variant="outline" asChild>
            <Link href={`/pvp/${seasonId}/match/${match._id}`}>
              <PencilIcon />
            </Link>
          </Button>

          <ConfirmDialog
            title="Delete PVP record?"
            description="Are you sure you want to delete this PVP match record? This action cannot be undone."
            confirmVariant="destructive"
            onConfirm={handleDeleteMatch}
          >
            <Button variant="destructive">
              <TrashIcon />
            </Button>
          </ConfirmDialog>
        </div>
      </div>
    </article>
  );
}
