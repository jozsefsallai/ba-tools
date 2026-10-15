"use client";

import { PVPEnemyPresetMergeDialog } from "@/app/[locale]/pvp/_components/pvp-enemy-preset-merge-dialog";
import pvpAnon from "@/assets/images/pvp-anon.png";
import { EmptyCard } from "@/components/common/empty-card";
import { StudentCard } from "@/components/common/student-card";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { useStudents } from "@/hooks/use-students";
import { Link } from "@/i18n/navigation";
import { useMutation, usePaginatedQuery } from "convex/react";
import {
  ChevronLeftIcon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  SearchIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "~convex/api";
import type { Doc, Id } from "~convex/dataModel";

export function PVPEnemyPresetsPage({
  seasonId,
}: { seasonId: Id<"pvpSeason"> }) {
  const t = useTranslations();
  const { studentMap } = useStudents();
  const [search, setSearch] = useState("");
  const [mergeSource, setMergeSource] = useState<Doc<"pvpEnemyPreset">>();
  const [deleteSource, setDeleteSource] = useState<Doc<"pvpEnemyPreset">>();
  const debouncedSearch = useDebounce(search, 250);
  const {
    results: presets,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.pvp.listEnemyPresets,
    { seasonId, search: debouncedSearch },
    { initialNumItems: 30 },
  );
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

      <div className="relative max-w-md">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("tools.pvp.presets.searchEnemies")}
          className="pl-9"
        />
      </div>

      <article className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={pvpAnon.src}
            alt=""
            width={pvpAnon.width}
            height={pvpAnon.height}
            className="h-14 w-auto shrink-0 object-contain"
          />

          <h2 className="truncate font-semibold">
            {t("tools.pvp.presets.anonymous")}
          </h2>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/pvp/${seasonId}/presets/opponents/anonymous/teams`}>
              {t("tools.pvp.presets.teams")}
            </Link>
          </Button>

          <Button size="sm" variant="outline" asChild>
            <Link href={`/pvp/${seasonId}/presets/opponents/anonymous/history`}>
              {t("tools.pvp.presets.battleHistory")}
            </Link>
          </Button>
        </div>
      </article>

      {status === "LoadingFirstPage" ? (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          {t("tools.pvp.presets.loadingEnemies")}
        </div>
      ) : presets.length === 0 && status === "Exhausted" ? (
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
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
                key={preset._id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 px-2" style={{ zoom: 0.65 }}>
                    {rep ? (
                      <StudentCard
                        student={rep}
                        noDisplayRole
                        noAttackTypeStyling
                      />
                    ) : (
                      <EmptyCard label="" />
                    )}
                  </div>

                  <h2 className="truncate font-semibold">{preset.name}</h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={`/pvp/${seasonId}/presets/opponents/${preset._id}/teams`}
                    >
                      {t("tools.pvp.presets.teams")}
                    </Link>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t("tools.pvp.presets.actions")}
                      >
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/pvp/${seasonId}/presets/opponents/${preset._id}`}
                          >
                            {t("tools.pvp.presets.edit")}
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onSelect={() => setMergeSource(preset)}
                        >
                          {t("tools.pvp.presets.mergeWith")}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>

                      <DropdownMenuSeparator />

                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setDeleteSource(preset)}
                        >
                          {t("tools.pvp.presets.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {deleteSource && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setDeleteSource(undefined)}
          title={t("tools.pvp.presets.deleteEnemyTitle")}
          description={t("tools.pvp.presets.deleteEnemyDescription")}
          confirmVariant="destructive"
          onConfirm={() => remove({ presetId: deleteSource._id })}
        />
      )}

      {mergeSource && (
        <PVPEnemyPresetMergeDialog
          source={mergeSource}
          onClose={() => setMergeSource(undefined)}
        />
      )}

      {status === "CanLoadMore" && (
        <Button variant="outline" onClick={() => loadMore(30)}>
          {t("tools.pvp.presets.loadMoreEnemies")}
        </Button>
      )}

      {status === "LoadingMore" && (
        <Button variant="outline" disabled>
          <LoaderCircleIcon className="animate-spin" />
          {t("common.loadingMore")}
        </Button>
      )}
    </div>
  );
}
