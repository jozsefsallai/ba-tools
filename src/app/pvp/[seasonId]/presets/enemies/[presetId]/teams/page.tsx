"use client";

import { MessageBox } from "@/components/common/message-box";
import { Button } from "@/components/ui/button";
import { useStudents } from "@/hooks/use-students";
import { buildStudentPortraitUrl } from "@/lib/url";
import { useQuery } from "convex/react";
import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export default function EnemyPresetTeamsPage({
  params,
}: {
  params: Promise<{ seasonId: string; presetId: string }>;
}) {
  const resolved = use(params);
  const seasonId = resolved.seasonId as Id<"pvpSeason">;
  const presetId = resolved.presetId as Id<"pvpEnemyPreset">;

  const history = useQuery(api.pvp.getEnemyPresetHistory, { presetId });
  const { studentMap } = useStudents();

  if (!history) {
    return <MessageBox>Loading enemy teams...</MessageBox>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/pvp/${seasonId}/presets/enemies`}>
            <ChevronLeftIcon />
          </Link>
        </Button>

        <h1 className="text-xl font-bold">
          Teams Used by {history.preset.name}
        </h1>
      </div>

      {history.matches.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No matches have been attached to this enemy preset.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {history.matches.map((match) => (
            <article
              className="flex flex-wrap items-center gap-3 rounded-lg border p-4"
              key={match._id}
            >
              <span className="w-28 text-sm text-muted-foreground">
                {new Date(match.date).toLocaleDateString()}
              </span>

              {match.opponentTeam.map((item, index) => {
                const student = item.studentId
                  ? studentMap[item.studentId]
                  : undefined;

                return student ? (
                  <img
                    key={`${match._id}-${index}`}
                    src={buildStudentPortraitUrl(student)}
                    alt={student.name}
                    title={student.name}
                    className="size-14 rounded object-cover"
                  />
                ) : (
                  <div
                    key={`${match._id}-${index}`}
                    className="size-14 rounded border border-dashed"
                  />
                );
              })}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
