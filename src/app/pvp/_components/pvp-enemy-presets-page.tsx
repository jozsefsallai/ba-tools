"use client";

import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useStudents } from "@/hooks/use-students";
import { buildStudentPortraitUrl } from "@/lib/url";
import { useMutation, useQuery } from "convex/react";
import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export function PVPEnemyPresetsPage({
  seasonId,
}: { seasonId: Id<"pvpSeason"> }) {
  const { studentMap } = useStudents();

  const presets = useQuery(api.pvp.listEnemyPresets, { seasonId });
  const remove = useMutation(api.pvp.deleteEnemyPreset);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/pvp/${seasonId}`}>
              <ChevronLeftIcon />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">Enemy Presets</h1>
        </div>

        <Button asChild>
          <Link href={`/pvp/${seasonId}/presets/enemies/new`}>
            Create Enemy Preset
          </Link>
        </Button>
      </div>

      {presets === undefined ? (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          Loading enemy presets...
        </div>
      ) : presets.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No enemy presets yet.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {presets.map((preset) => {
            const rep = preset.opponentStudentRepId
              ? studentMap[preset.opponentStudentRepId]
              : undefined;

            return (
              <article
                className="flex items-center justify-between gap-4 rounded-lg border p-4"
                key={preset._id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {rep ? (
                    <img
                      src={buildStudentPortraitUrl(rep)}
                      alt={rep.name}
                      className="size-14 rounded-md object-cover"
                    />
                  ) : (
                    <div className="size-14 rounded-md border border-dashed" />
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{preset.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      Enemy preset
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={`/pvp/${seasonId}/presets/enemies/${preset._id}/teams`}
                    >
                      Teams
                    </Link>
                  </Button>

                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={`/pvp/${seasonId}/presets/enemies/${preset._id}`}
                    >
                      Edit
                    </Link>
                  </Button>

                  <ConfirmDialog
                    title="Delete enemy preset?"
                    description="This enemy preset will be permanently deleted. Existing matches will be kept."
                    confirmVariant="destructive"
                    onConfirm={() => remove({ presetId: preset._id })}
                  >
                    <Button size="sm" variant="destructive">
                      Delete
                    </Button>
                  </ConfirmDialog>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
