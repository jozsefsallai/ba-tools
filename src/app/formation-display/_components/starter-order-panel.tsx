"use client";

import type { StudentItem } from "@/app/formation-display/_components/formation-preview";
import { Button } from "@/components/ui/button";
import {
  type FormationType,
  resolveStarterOrders,
  starterMaxFor,
  starterThresholdFor,
} from "@/lib/formation-type";
import { buildStudentIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon, XIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";

type StarterOrderPanelProps = {
  row?: {
    strikers: StudentItem[];
    specials: StudentItem[];
  };
  formationType: FormationType;
  onUpdateItem: (
    itemId: string,
    data: Partial<Omit<StudentItem, "student" | "id">>,
  ) => void;
};

type SortableStarterEntryProps = {
  id: string;
  content: React.ReactNode;
};

function SortableStarterEntry({ id, content }: SortableStarterEntryProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className="flex items-center gap-2 rounded-md border px-2 py-1.5 bg-background"
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground"
        aria-label="Drag starter skill order"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>

      {content}
    </div>
  );
}

export function StarterOrderPanel({
  row,
  formationType,
  onUpdateItem,
}: StarterOrderPanelProps) {
  const t = useTranslations();
  const starterThreshold = starterThresholdFor(formationType);
  const starterMax = starterMaxFor(formationType);

  const rowItems = useMemo(
    () => [...(row?.strikers ?? []), ...(row?.specials ?? [])],
    [row],
  );

  const resolvedOrders = useMemo(
    () => resolveStarterOrders(rowItems),
    [rowItems],
  );

  const starterEntries = useMemo(
    () =>
      rowItems
        .filter((item) => item.student && item.starter)
        .sort(
          (a, b) =>
            (resolvedOrders.get(a.id) ?? Number.POSITIVE_INFINITY) -
            (resolvedOrders.get(b.id) ?? Number.POSITIVE_INFINITY),
        ),
    [rowItems, resolvedOrders],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) {
      return;
    }

    const currentIndex = starterEntries.findIndex(
      (item) => item.id === active.id,
    );
    const nextIndex = starterEntries.findIndex((item) => item.id === over.id);
    if (currentIndex < 0 || nextIndex < 0) {
      return;
    }

    const moved = arrayMove(starterEntries, currentIndex, nextIndex);
    moved.forEach((item, index) => {
      onUpdateItem(item.id, { starterOrder: index + 1 });
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl rounded-md border p-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium">
          {t("tools.formationDisplay.starterOrder.title")}
        </div>
        <div className="text-sm text-muted-foreground">
          {t("tools.formationDisplay.starterOrder.count", {
            count: starterEntries.length,
            max: starterMax,
          })}
        </div>
      </div>

      {starterEntries.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          {t("tools.formationDisplay.starterOrder.empty")}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext
            items={starterEntries.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2">
              {starterEntries.map((item) => {
                if (!item.student) {
                  return null;
                }

                const order = resolvedOrders.get(item.id) ?? 0;
                const pastThreshold = order > starterThreshold;
                return (
                  <SortableStarterEntry
                    key={item.id}
                    id={item.id}
                    content={
                      <>
                        <img
                          src={buildStudentIconUrl(item.student)}
                          alt={item.student?.name}
                          className="size-8 rounded-md"
                        />
                        <div className="flex-1 truncate text-sm">
                          {item.student?.name}
                        </div>
                        <div
                          className={cn(
                            "text-xs font-bold rounded px-2 py-0.5",
                            pastThreshold
                              ? "bg-[#5fa3ff] text-black"
                              : "bg-[#ffff4d] text-black",
                          )}
                        >
                          #{order}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            onUpdateItem(item.id, {
                              starter: false,
                              starterOrder: undefined,
                            })
                          }
                          className="size-7"
                        >
                          <XIcon className="size-4" />
                        </Button>
                      </>
                    }
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
