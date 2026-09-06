"use client";

import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useStudents } from "@/hooks/use-students";
import { buildStudentPortraitUrl } from "@/lib/url";
import { useMutation, useQuery } from "convex/react";
import { ChevronLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export function PVPEnemyPresetsPage({
  seasonId,
}: { seasonId: Id<"pvpSeason"> }) {
  const t = useTranslations();
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
          <h1 className="text-xl font-bold">
            {t("tools.pvp.presets.enemyTitle")}
          </h1>
        </div>

        <Button asChild>
          <Link href={`/pvp/${seasonId}/presets/opponents/new`}>
            {t("tools.pvp.presets.createEnemy")}
          </Link>
        </Button>
      </div>

      {presets === undefined ? (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          {t("tools.pvp.presets.loadingEnemies")}
        </div>
      ) : presets.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          {t("tools.pvp.presets.noEnemies")}
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
                      {t("tools.pvp.presets.enemyPreset")}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={`/pvp/${seasonId}/presets/opponents/${preset._id}/teams`}
                    >
                      {t("tools.pvp.presets.teams")}
                    </Link>
                  </Button>

                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={`/pvp/${seasonId}/presets/opponents/${preset._id}`}
                    >
                      {t("tools.pvp.presets.edit")}
                    </Link>
                  </Button>

                  <ConfirmDialog
                    title={t("tools.pvp.presets.deleteEnemyTitle")}
                    description={t("tools.pvp.presets.deleteEnemyDescription")}
                    confirmVariant="destructive"
                    onConfirm={() => remove({ presetId: preset._id })}
                  >
                    <Button size="sm" variant="destructive">
                      {t("tools.pvp.presets.delete")}
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
