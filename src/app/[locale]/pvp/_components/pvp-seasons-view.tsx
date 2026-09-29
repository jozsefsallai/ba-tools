"use client";

import { MessageBox } from "@/components/common/message-box";
import { NewPVPSeasonDialog } from "@/components/dialogs/new-pvp-season-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { useQueryWithStatus } from "@/lib/convex";
import { cn } from "@/lib/utils";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation } from "convex/react";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  PlusIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";
import type { Doc, Id } from "~convex/dataModel";

type Season = Doc<"pvpSeason">;

type SeasonCardProps = {
  season: Season;
  archived: boolean;
  onArchiveChange: (seasonId: Id<"pvpSeason">, archived: boolean) => void;
};

function SeasonCard({ season, archived, onArchiveChange }: SeasonCardProps) {
  const t = useTranslations();
  const sortable = useSortable({ id: season._id, disabled: archived });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition,
    zIndex: sortable.isDragging ? 1 : undefined,
  };

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        "relative h-full rounded-md border",
        sortable.isDragging && "z-10 shadow-lg ring-2 ring-ring/40",
        archived && "bg-muted/30",
      )}
    >
      <Link
        href={`/pvp/${season._id}`}
        className="flex h-full flex-col items-center justify-center gap-2 rounded-md p-4 pr-12 pl-12 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <h2 className="text-center text-2xl font-bold">{season.name}</h2>

        <p className="text-sm font-medium">
          {t("tools.pvp.seasons.number", {
            number: season.seasonNumber ?? t("tools.pvp.seasons.unassigned"),
          })}
        </p>

        <p className="text-sm text-muted-foreground">
          {t("tools.pvp.seasons.server", { server: season.gameServer })}
        </p>
      </Link>

      {!archived && (
        <Button
          aria-label={t("tools.pvp.seasons.reorder", { name: season.name })}
          className="absolute top-2 left-2 z-10 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          type="button"
          variant="ghost"
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVerticalIcon />
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={t("tools.pvp.seasons.actions", { name: season.name })}
            className="absolute top-2 right-2 z-10"
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => onArchiveChange(season._id, !archived)}
          >
            {archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
            {t(
              archived
                ? "tools.pvp.seasons.unarchive"
                : "tools.pvp.seasons.archive",
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function PVPSeasonsView({
  showArchived,
  onShowArchivedChange,
}: {
  showArchived: boolean;
  onShowArchivedChange: (showArchived: boolean) => void;
}) {
  const t = useTranslations();
  const query = useQueryWithStatus(api.pvp.getOwnSeasons);
  const reorderSeasons = useMutation(
    api.pvp.reorderSeasons,
  ).withOptimisticUpdate((store, { seasonIds }) => {
    const seasons = store.getQuery(api.pvp.getOwnSeasons, {});
    if (!seasons) {
      return;
    }

    const order = new Map(seasonIds.map((id, index) => [id, index]));
    store.setQuery(
      api.pvp.getOwnSeasons,
      {},
      [...seasons].sort((a, b) => {
        const aOrder = order.get(a._id);
        const bOrder = order.get(b._id);

        if (aOrder === undefined || bOrder === undefined) {
          return 0;
        }

        return aOrder - bOrder;
      }),
    );
  });

  const setSeasonArchived = useMutation(
    api.pvp.setSeasonArchived,
  ).withOptimisticUpdate((store, { seasonId, archived }) => {
    const seasons = store.getQuery(api.pvp.getOwnSeasons, {});
    if (!seasons) {
      return;
    }

    store.setQuery(
      api.pvp.getOwnSeasons,
      {},
      seasons.map((season) =>
        season._id === seasonId ? { ...season, archived } : season,
      ),
    );
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeSeasons = useMemo(
    () => query.data?.filter((season) => !season.archived) ?? [],
    [query.data],
  );

  const archivedSeasons = useMemo(
    () => query.data?.filter((season) => season.archived) ?? [],
    [query.data],
  );

  if (query.status === "pending") {
    return <MessageBox>{t("common.loading")}</MessageBox>;
  }

  if (query.status === "error") {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        {t("tools.pvp.seasons.failedToLoad")}
      </MessageBox>
    );
  }

  async function handleArchiveChange(
    seasonId: Id<"pvpSeason">,
    archived: boolean,
  ) {
    try {
      await setSeasonArchived({ seasonId, archived });
      toast.success(
        t(
          archived
            ? "tools.pvp.seasons.archivedSuccess"
            : "tools.pvp.seasons.unarchivedSuccess",
        ),
      );
    } catch (error) {
      console.error(error);
      toast.error(
        t(
          archived
            ? "tools.pvp.seasons.archiveFailed"
            : "tools.pvp.seasons.unarchiveFailed",
        ),
      );
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = activeSeasons.findIndex(
      (season) => season._id === active.id,
    );

    const newIndex = activeSeasons.findIndex(
      (season) => season._id === over.id,
    );

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reordered = arrayMove(activeSeasons, oldIndex, newIndex);

    void reorderSeasons({
      seasonIds: reordered.map((season) => season._id),
    }).catch((error) => {
      console.error(error);
      toast.error(t("tools.pvp.seasons.reorderFailed"));
    });
  }

  const visibleSeasons = showArchived ? archivedSeasons : activeSeasons;

  return (
    <>
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <SortableContext
          items={showArchived ? [] : activeSeasons.map((season) => season._id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {!showArchived && (
              <NewPVPSeasonDialog onCreate={() => onShowArchivedChange(false)}>
                <div className="flex h-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-4 hover:bg-accent">
                  <PlusIcon className="size-8" />
                  <div className="text-xl font-medium">
                    {t("tools.pvp.seasons.createNew")}
                  </div>
                </div>
              </NewPVPSeasonDialog>
            )}

            {visibleSeasons.map((season) => (
              <SeasonCard
                key={season._id}
                archived={showArchived}
                season={season}
                onArchiveChange={handleArchiveChange}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {visibleSeasons.length === 0 && (
        <MessageBox className="mt-4">
          {t(
            showArchived
              ? "tools.pvp.seasons.archivedEmpty"
              : "tools.pvp.seasons.empty",
          )}
        </MessageBox>
      )}
    </>
  );
}
