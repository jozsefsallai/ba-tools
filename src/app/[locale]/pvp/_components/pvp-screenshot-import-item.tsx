"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

export function PvpScreenshotImportItem({
  item,
  locked,
  status,
  onPreview,
  onRemove,
}: {
  item: { id: string; file: File; url: string };
  locked: boolean;
  status?: string;
  onPreview: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations();

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: locked });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      setActivatorNodeRef(node);
    },
    [setNodeRef, setActivatorNodeRef],
  );

  return (
    <div
      ref={setRefs}
      {...attributes}
      {...listeners}
      tabIndex={locked ? -1 : attributes.tabIndex}
      aria-label={t("tools.pvp.screenshotImport.reorder", {
        name: item.file.name,
      })}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : undefined,
      }}
      className={cn(
        "group relative flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        !locked &&
          "cursor-grab select-none touch-manipulation active:cursor-grabbing",
        isDragging && "shadow-lg ring-2 ring-ring",
      )}
    >
      <button
        type="button"
        className="rounded focus-visible:outline focus-visible:outline-ring"
        onClick={() => onPreview(item.id)}
        aria-label={t("tools.pvp.screenshotImport.preview", {
          name: item.file.name,
        })}
      >
        <img
          src={item.url}
          alt={item.file.name}
          draggable={false}
          className="aspect-video w-full rounded object-contain"
        />
      </button>

      <Button
        type="button"
        size="icon-sm"
        variant="default"
        className="absolute right-1 top-1 opacity-0 shadow-sm group-hover:opacity-100 group-focus-within:opacity-100 disabled:hidden motion-reduce:transition-none [@media(hover:none)]:opacity-100"
        disabled={locked}
        aria-label={t("tools.pvp.screenshotImport.remove", {
          name: item.file.name,
        })}
        title={t("tools.pvp.screenshotImport.remove", { name: item.file.name })}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onRemove(item.id);
        }}
      >
        <XIcon />
      </Button>

      <span className="truncate text-sm" title={item.file.name}>
        {item.file.name}
      </span>

      {status && (
        <span className="text-xs text-muted-foreground">{status}</span>
      )}
    </div>
  );
}
