"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  EllipsisIcon,
  ExternalLinkIcon,
  GripVerticalIcon,
  ListXIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { type ComponentProps, useState } from "react";
import { TimelineCard } from "@/components/timelines/timeline-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { preventTouchContextMenu, TOUCH_DRAG_CLASS } from "@/lib/dnd-mobile";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export type OwnTimelineEntryProps = {
  entry: FunctionReturnType<typeof api.timeline.getOwn>[number];
  onWantsToDeleteFromGroup?: (id: Id<"timeline">) => void;
} & Pick<ComponentProps<typeof TimelineCard>, "dragHandle" | "ref" | "style">;

export function OwnTimelineEntry({
  entry,
  onWantsToDeleteFromGroup,
  dragHandle,
  ref,
  style,
}: OwnTimelineEntryProps) {
  const t = useTranslations();

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const destroyMutation = useMutation(api.timeline.destroy);

  async function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);

      setTimeout(() => {
        setDeleteConfirm(false);
      }, 5000);

      return;
    }

    await destroyMutation({
      id: entry._id as Id<"timeline">,
    });

    onWantsToDeleteFromGroup?.(entry._id);
  }

  return (
    <TimelineCard
      ref={ref}
      style={style}
      entry={entry}
      showVisibility
      dragHandle={dragHandle}
      actions={
        <>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/timeline-visualizer?id=${entry._id}`}>
              <PencilIcon />
              {t("common.edit")}
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={t("tools.myTimelines.moreActions")}
              >
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              {entry.visibility === "public" && (
                <DropdownMenuItem asChild>
                  <Link href={`/timelines/${entry._id}`}>
                    <ExternalLinkIcon />
                    {t("tools.myTimelines.editGroup.viewPublicTimeline")}
                  </Link>
                </DropdownMenuItem>
              )}

              {onWantsToDeleteFromGroup && (
                <DropdownMenuItem
                  onSelect={() => onWantsToDeleteFromGroup(entry._id)}
                >
                  <ListXIcon />
                  {t("tools.myTimelines.editGroup.removeFromGroup")}
                </DropdownMenuItem>
              )}

              {(entry.visibility === "public" || onWantsToDeleteFromGroup) && (
                <DropdownMenuSeparator />
              )}

              <DropdownMenuItem
                variant="destructive"
                onSelect={(event) => {
                  // The first click only arms it, so the menu stays open.
                  if (!deleteConfirm) {
                    event.preventDefault();
                  }

                  handleDelete();
                }}
              >
                <Trash2Icon />
                {deleteConfirm
                  ? t("tools.myTimelines.editGroup.clickAgainToConfirm")
                  : t("tools.myTimelines.editGroup.deleteTimeline")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
}

export function SortableOwnTimelineEntry({
  entry,
  onWantsToDeleteFromGroup,
}: Pick<OwnTimelineEntryProps, "entry" | "onWantsToDeleteFromGroup">) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: entry._id,
      animateLayoutChanges: () => false,
    });

  return (
    <OwnTimelineEntry
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      entry={entry}
      onWantsToDeleteFromGroup={onWantsToDeleteFromGroup}
      dragHandle={
        <Button
          variant="ghost"
          size="icon-sm"
          className={`-ml-1 shrink-0 cursor-move touch-none ${TOUCH_DRAG_CLASS}`}
          onContextMenu={preventTouchContextMenu}
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon />
        </Button>
      }
    />
  );
}
