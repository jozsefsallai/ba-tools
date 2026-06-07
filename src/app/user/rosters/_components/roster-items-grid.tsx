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
import type { Student } from "~prisma";

export type RosterItemsGridProps = {
  items: RosterItem[];
  gameServer: GameServer;
  updateRosterItem: (
    studentId: string,
    updatedItem: Partial<RosterItem>,
  ) => void;
  onRemove: (studentId: string) => void;
  onReorder: (items: RosterItem[]) => void;
  isReleasedOnServer: (student: Student, gameServer: GameServer) => boolean;
};

function reorderVisibleRosterItems(
  items: RosterItem[],
  activeId: string,
  overId: string,
  gameServer: GameServer,
  isReleasedOnServer: (student: Student, gameServer: GameServer) => boolean,
): RosterItem[] {
  const isVisible = (item: RosterItem) =>
    isReleasedOnServer(item.student, gameServer);

  const visibleIds = items.filter(isVisible).map((item) => item.student.id);

  const oldIndex = visibleIds.indexOf(activeId);
  const newIndex = visibleIds.indexOf(overId);

  if (oldIndex === -1 || newIndex === -1) {
    return items;
  }

  const reorderedVisibleIds = arrayMove(visibleIds, oldIndex, newIndex);
  const itemById = new Map(items.map((item) => [item.student.id, item]));
  const visibleQueue = [...reorderedVisibleIds];

  return items.map((item) => {
    if (isVisible(item)) {
      const nextId = visibleQueue.shift();

      if (!nextId) {
        return item;
      }

      const nextItem = itemById.get(nextId);

      if (!nextItem) {
        return item;
      }

      return nextItem;
    }

    return item;
  });
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
  isReleasedOnServer,
}: RosterItemsGridProps) {
  const visibleItems = items.filter((item) =>
    isReleasedOnServer(item.student, gameServer),
  );

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
      reorderVisibleRosterItems(
        items,
        active.id as string,
        over.id as string,
        gameServer,
        isReleasedOnServer,
      ),
    );
  }

  const sortableIds = visibleItems.map((item) => item.student.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleItems.map((rosterItem) => (
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
