"use client";

import {
  type RosterItem,
  RosterItemEditor,
} from "@/app/user/rosters/_components/roster-item-editor";
import { useGridColumnCount } from "@/hooks/use-grid-column-count";
import type { GameServer } from "@/lib/types";
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
import { memo, useCallback, useMemo } from "react";
import { WindowVirtualizer } from "virtua";

export type RosterItemsGridProps = {
  items: RosterItem[];
  gameServer: GameServer;
  updateRosterItem: (
    studentId: string,
    updatedItem: Partial<RosterItem>,
  ) => void;
  onRemove: (studentId: string) => void;
  onReorder: (items: RosterItem[]) => void;
};

function reorderRosterItems(
  items: RosterItem[],
  activeId: string,
  overId: string,
): RosterItem[] {
  const oldIndex = items.findIndex((item) => item.student.id === activeId);
  const newIndex = items.findIndex((item) => item.student.id === overId);

  if (oldIndex === -1 || newIndex === -1) {
    return items;
  }

  return arrayMove(items, oldIndex, newIndex);
}

function chunkItems<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
}

type SortableRosterItemProps = {
  rosterItem: RosterItem;
  gameServer: GameServer;
  updateRosterItem: (
    studentId: string,
    updatedItem: Partial<RosterItem>,
  ) => void;
  onRemove: (studentId: string) => void;
};

const SortableRosterItem = memo(function SortableRosterItem({
  rosterItem,
  gameServer,
  updateRosterItem,
  onRemove,
}: SortableRosterItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: rosterItem.student.id,
    animateLayoutChanges: () => false,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <RosterItemEditor
        gameServer={gameServer}
        rosterItem={rosterItem}
        updateRosterItem={updateRosterItem}
        onRemove={onRemove}
        dragHandleProps={listeners}
      />
    </div>
  );
});

type RosterItemRowProps = {
  row: RosterItem[];
  gameServer: GameServer;
  updateRosterItem: (
    studentId: string,
    updatedItem: Partial<RosterItem>,
  ) => void;
  onRemove: (studentId: string) => void;
};

const RosterItemRow = memo(function RosterItemRow({
  row,
  gameServer,
  updateRosterItem,
  onRemove,
}: RosterItemRowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
      {row.map((rosterItem) => (
        <SortableRosterItem
          key={rosterItem.student.id}
          rosterItem={rosterItem}
          gameServer={gameServer}
          updateRosterItem={updateRosterItem}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
});

export const RosterItemsGrid = memo(function RosterItemsGrid({
  items,
  gameServer,
  updateRosterItem,
  onRemove,
  onReorder,
}: RosterItemsGridProps) {
  const columnCount = useGridColumnCount();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) {
        return;
      }

      onReorder(
        reorderRosterItems(items, active.id as string, over.id as string),
      );
    },
    [items, onReorder],
  );

  const sortableIds = useMemo(
    () => items.map((item) => item.student.id),
    [items],
  );

  const itemRows = useMemo(
    () => chunkItems(items, columnCount),
    [items, columnCount],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
        <WindowVirtualizer>
          {itemRows.map((row) => (
            <RosterItemRow
              key={row.map((item) => item.student.id).join("-")}
              row={row}
              gameServer={gameServer}
              updateRosterItem={updateRosterItem}
              onRemove={onRemove}
            />
          ))}
        </WindowVirtualizer>
      </SortableContext>
    </DndContext>
  );
});
