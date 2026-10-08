"use client";

import type { PVPFormationStudentItem } from "@/app/[locale]/pvp/_lib/types";
import { cn } from "@/lib/utils";
import {
  DndContext,
  KeyboardCode,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  type SortingStrategy,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";
import { Fragment, type ReactNode, useId, useRef } from "react";

type PVPFormationEditorStripProps = {
  formation: PVPFormationStudentItem[];
  onMove(from: number, to: number): void;
  strategy?: SortingStrategy;
  renderItem(
    item: PVPFormationStudentItem,
    index: number,
    id: string,
    triggerId: string,
  ): ReactNode;
};

export function PVPFormationEditorStrip({
  formation,
  onMove,
  renderItem,
  strategy = horizontalListSortingStrategy,
}: PVPFormationEditorStripProps) {
  const t = useTranslations();

  const editorId = useId();

  const emptyIds = useRef(new WeakMap<PVPFormationStudentItem, string>());
  const nextEmptyId = useRef(0);
  const dropAllowed = useRef(true);

  const ids = formation.map((item) => {
    if (item.student) {
      return item.student.id;
    }

    let id = emptyIds.current.get(item);

    if (!id) {
      id = `empty-${nextEmptyId.current++}`;
      emptyIds.current.set(item, id);
    }

    return id;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),

    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: {
        start: [KeyboardCode.Space],
        end: [KeyboardCode.Space],
        cancel: [KeyboardCode.Esc],
      },
    }),
  );

  const itemId = (index: number) => ids[index];

  return (
    <div
      className="@container/formation -mx-2 min-w-0 overflow-x-auto px-2 pt-2 pb-2"
      onFocusCapture={(event) =>
        event.target.scrollIntoView({ block: "nearest", inline: "nearest" })
      }
    >
      <div className="flex w-max min-w-full flex-col items-center justify-center gap-3 @min-[600px]/formation:flex-row @min-[600px]/formation:items-start">
        {[
          { start: 0, end: 4 },
          { start: 4, end: 6 },
        ].map(({ start, end }) => (
          <DndContext
            key={start}
            sensors={sensors}
            accessibility={{
              screenReaderInstructions: {
                draggable: t("tools.pvp.formationEditorItem.dragInstructions"),
              },
            }}
            collisionDetection={(args) => {
              const pointer = args.pointerCoordinates;
              const rects = Array.from(args.droppableRects.values());
              dropAllowed.current =
                !pointer ||
                (rects.length > 0 &&
                  pointer.x >= Math.min(...rects.map((rect) => rect.left)) &&
                  pointer.x <= Math.max(...rects.map((rect) => rect.right)) &&
                  pointer.y >= Math.min(...rects.map((rect) => rect.top)) &&
                  pointer.y <= Math.max(...rects.map((rect) => rect.bottom)));

              // A null target resets the dragged card's transform, causing a flash
              // at its original slot. Keep a target even in gaps or outside the group;
              // validate the drop separately and reset the preview outside the group.
              return closestCenter(
                dropAllowed.current
                  ? args
                  : {
                      ...args,
                      droppableContainers: args.droppableContainers.filter(
                        (container) => container.id === args.active.id,
                      ),
                    },
              );
            }}
            onDragEnd={({ active, over }) => {
              const allowed = dropAllowed.current;
              dropAllowed.current = true;
              if (!allowed || !over || active.id === over.id) {
                return;
              }

              const from = formation.findIndex(
                (_, index) => itemId(index) === active.id,
              );

              const to = formation.findIndex(
                (_, index) => itemId(index) === over.id,
              );

              if (from < start || from >= end || to < start || to >= end) {
                return;
              }

              onMove(from, to);
            }}
          >
            <SortableContext
              items={formation
                .slice(start, end)
                .map((_, offset) => itemId(start + offset))}
              strategy={strategy}
            >
              <div
                className={cn(
                  "flex items-start gap-1 rounded-xl border px-2 pt-3 pb-2",
                  start === 0
                    ? "border-type-red/35 bg-type-red/20"
                    : "border-type-blue/35 bg-type-blue/20",
                )}
              >
                {formation.slice(start, end).map((item, offset) => {
                  const index = start + offset;

                  return (
                    <Fragment key={itemId(index)}>
                      {renderItem(
                        item,
                        index,
                        itemId(index),
                        `${editorId}-slot-${index}`,
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        ))}
      </div>
    </div>
  );
}
