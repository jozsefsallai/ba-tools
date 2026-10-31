"use client";

import { OwnTimelineEntry } from "@/app/[locale]/user/timelines/_components/own-timeline-entry";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Doc, Id } from "~convex/dataModel";

export type TimelineDocWithId = Doc<"timeline"> & { id: Id<"timeline"> };

export type TimelineGroupItemsContainerProps = {
  items: TimelineDocWithId[];
  setItems: React.Dispatch<React.SetStateAction<TimelineDocWithId[]>>;
  onWantsToRemove(item: TimelineDocWithId): void;
};

export function TimelineGroupItemsContainer({
  items,
  setItems,
  onWantsToRemove,
}: TimelineGroupItemsContainerProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
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
