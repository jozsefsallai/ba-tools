"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { useStudents } from "@/hooks/use-students";
import { buildStudentPortraitUrl } from "@/lib/url";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "~convex/api";
import type { Doc, Id } from "~convex/dataModel";

export function PVPEnemyPresetMergeDialog({
  source,
  onClose,
}: {
  source: Pick<Doc<"pvpEnemyPreset">, "_id" | "seasonId" | "name">;
  onClose: () => void;
}) {
  const t = useTranslations();
  const { studentMap } = useStudents();

  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<{
    id: Id<"pvpEnemyPreset">;
    name: string;
  }>();
  const [isSaving, setIsSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const merge = useMutation(api.pvp.mergeEnemyPresets);

  const { results, status, loadMore } = usePaginatedQuery(
    api.pvp.listEnemyPresets,
    { seasonId: source.seasonId, search: useDebounce(search, 250) },
    { initialNumItems: 30 },
  );

  const candidates = results.filter((preset) => preset._id !== source._id);

  async function submit() {
    if (!target || isSaving) {
      return;
    }

    setIsSaving(true);
    setFailed(false);

    try {
      await merge({ sourcePresetId: source._id, targetPresetId: target.id });
      onClose();
    } catch {
      setFailed(true);
      setIsSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("tools.pvp.presets.mergeTitle", { name: source.name })}
          </DialogTitle>

          <DialogDescription>
            {t("tools.pvp.presets.mergeDescription")}
          </DialogDescription>
        </DialogHeader>

        <Input
          aria-label={t("tools.pvp.presets.searchEnemies")}
          placeholder={t("tools.pvp.presets.searchEnemies")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          disabled={isSaving}
        />

        <div
          className="flex max-h-64 flex-col gap-2 overflow-y-auto"
          aria-busy={status === "LoadingFirstPage"}
        >
          {status === "LoadingFirstPage" ? (
            <p className="text-sm text-muted-foreground">
              {t("tools.pvp.presets.loadingEnemies")}
            </p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("tools.pvp.presets.noMergeTargets")}
            </p>
          ) : (
            candidates.map((preset) => {
              const rep = preset.opponentStudentRepId
                ? studentMap[preset.opponentStudentRepId]
                : undefined;

              return (
                <Button
                  key={preset._id}
                  variant={target?.id === preset._id ? "secondary" : "outline"}
                  className="h-auto shrink-0 justify-start gap-3 py-2"
                  aria-pressed={target?.id === preset._id}
                  disabled={isSaving}
                  onClick={() => {
                    setTarget({ id: preset._id, name: preset.name });
                    setFailed(false);
                  }}
                >
                  {rep ? (
                    <img
                      src={buildStudentPortraitUrl(rep)}
                      alt={rep.name}
                      className="size-8 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <span className="size-8 shrink-0 rounded-md border border-dashed" />
                  )}

                  <span className="truncate">{preset.name}</span>
                </Button>
              );
            })
          )}

          {(status === "CanLoadMore" || status === "LoadingMore") && (
            <Button
              variant="outline"
              disabled={isSaving || status === "LoadingMore"}
              onClick={() => loadMore(30)}
            >
              {t("tools.pvp.presets.loadMoreEnemies")}
            </Button>
          )}
        </div>

        {target && (
          <p className="text-sm">
            {t("tools.pvp.presets.mergeConfirmation", {
              source: source.name,
              target: target.name,
            })}
          </p>
        )}
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            {t("tools.pvp.presets.mergeFailed")}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={isSaving} onClick={onClose}>
            {t("tools.pvp.presets.cancel")}
          </Button>

          <Button disabled={!target || isSaving} onClick={() => void submit()}>
            {isSaving
              ? t("tools.pvp.presets.merging")
              : t("tools.pvp.presets.merge")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
