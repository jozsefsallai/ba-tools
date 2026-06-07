"use client";

import {
  type RosterItem,
  RosterItemEditor,
} from "@/app/user/rosters/_components/roster-item-editor";
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

type SortableRosterItemProps = {
  rosterItem: RosterItem;
  gameServer: GameServer;
  updateRosterItem: (
    studentId: string,
    updatedItem: Partial<RosterItem>,
  ) => void;
  onRemove: (studentId: string) => void;
};

function SortableRosterItem({
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
}

export function RosterItemsGrid({
  items,
  gameServer,
  updateRosterItem,
  onRemove,
  onReorder,
}: RosterItemsGridProps) {
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

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) {
      return;
    }

    onReorder(
      reorderRosterItems(items, active.id as string, over.id as string),
    );
  }

  const sortableIds = items.map((item) => item.student.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((rosterItem) => (
            <SortableRosterItem
              key={rosterItem.student.id}
              rosterItem={rosterItem}
              gameServer={gameServer}
              updateRosterItem={updateRosterItem}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
