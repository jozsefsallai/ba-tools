"use client";

import { OwnTimelineEntry } from "@/app/user/timelines/_components/own-timeline-entry";
import {
  closestCenter,
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Student } from "@prisma/client";
import type { Doc, Id } from "~convex/dataModel";

export type TimelineDocWithId = Doc<"timeline"> & { id: Id<"timeline"> };

export type TimelineGroupItemsContainerProps = {
  allStudents: Student[];
  items: TimelineDocWithId[];
  setItems: React.Dispatch<React.SetStateAction<TimelineDocWithId[]>>;
  onWantsToRemove(item: TimelineDocWithId): void;
};

export function TimelineGroupItemsContainer({
  allStudents,
  items,
  setItems,
  onWantsToRemove,
}: TimelineGroupItemsContainerProps) {
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

    setItems((current) => {
      const oldIndex = current.findIndex((item) => item._id === active.id);
      const newIndex = current.findIndex((item) => item._id === over.id);

      return arrayMove(current, oldIndex, newIndex);
    });
  }

  function handleRemove(id: Id<"timeline">) {
    const item = items.find((i) => i._id === id);

    if (item) {
      onWantsToRemove(item);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-4">
          {items.map((entry) => (
            <OwnTimelineEntry
              key={entry._id}
              allStudents={allStudents}
              entry={entry}
              isGroupItem
              onWantsToDeleteFromGroup={handleRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
