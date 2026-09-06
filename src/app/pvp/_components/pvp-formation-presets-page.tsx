"use client";

import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStudents } from "@/hooks/use-students";
import { buildStudentPortraitUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export function PVPFormationPresetsPage({
  seasonId,
}: { seasonId: Id<"pvpSeason"> }) {
  const { studentMap } = useStudents();

  const presets = useQuery(api.pvp.listFormationPresets, { seasonId });
  const remove = useMutation(api.pvp.deleteFormationPreset);

  const [filter, setFilter] = useState<"attack" | "defense" | "both">("both");

  const visiblePresets = useMemo(
    () =>
      presets?.filter(
        (preset) =>
          filter === "both" ||
          !preset.matchType ||
          preset.matchType === "both" ||
          preset.matchType === filter,
      ),
    [filter, presets],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/pvp/${seasonId}`}>
              <ChevronLeftIcon />
            </Link>
          </Button>

          <h1 className="text-xl font-bold">Formation Presets</h1>
        </div>

        <Button asChild>
          <Link href={`/pvp/${seasonId}/presets/formations/new`}>
            Create Formation Preset
          </Link>
        </Button>
      </div>

      <div className="flex w-full max-w-sm items-center gap-3">
        <Label htmlFor="formation-type-filter">Formation type</Label>

        <Select
          value={filter}
          onValueChange={(value) => setFilter(value as typeof filter)}
        >
          <SelectTrigger id="formation-type-filter" className="flex-1">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="both">Both</SelectItem>
            <SelectItem value="attack">Attack</SelectItem>
            <SelectItem value="defense">Defense</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {presets === undefined ? (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          Loading formation presets...
        </div>
      ) : visiblePresets?.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No formation presets match this filter.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visiblePresets?.map((preset) => (
            <article
              className={cn(
                "flex flex-col gap-4 rounded-lg border p-4",
                preset.usedByMe &&
                  "border-amber-400/60 shadow-[0_0_18px_rgba(251,191,36,0.18)]",
              )}
              key={preset._id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{preset.name}</h2>
                  <span className="text-xs uppercase text-muted-foreground">
                    {preset.matchType ?? "Both"}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={`/pvp/${seasonId}/presets/formations/${preset._id}`}
                    >
                      Edit
                    </Link>
                  </Button>

                  <ConfirmDialog
                    title="Delete formation preset?"
                    description="This formation preset will be permanently deleted."
                    confirmVariant="destructive"
                    onConfirm={() => remove({ presetId: preset._id })}
                  >
                    <Button size="sm" variant="destructive">
                      Delete
                    </Button>
                  </ConfirmDialog>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto">
                {preset.team.map((item, index) => {
                  const student = item.studentId
                    ? studentMap[item.studentId]
                    : undefined;

                  return student ? (
                    <img
                      key={`${preset._id}-${index}`}
                      src={buildStudentPortraitUrl(student)}
                      alt={student.name}
                      title={student.name}
                      className="size-14 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div
                      key={`${preset._id}-${index}`}
                      className="size-14 shrink-0 rounded-md border border-dashed"
                    />
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
