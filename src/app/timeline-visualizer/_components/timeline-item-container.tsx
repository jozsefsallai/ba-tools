"use client";

import { TimelineItem } from "@/app/timeline-visualizer/_components/timeline-item";
import type { TimelineItem as TimelineItemType } from "@/app/timeline-visualizer/_components/timeline-preview";
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

export type TimelineItemContainerProps = {
  items: TimelineItemType[];
  setItems: (
    items:
      | TimelineItemType[]
      | ((items: TimelineItemType[]) => TimelineItemType[]),
  ) => void;
  onWantsToRemove(item: TimelineItemType): void;
  onWantsToUpdate(
    item: TimelineItemType,
    data: Omit<TimelineItemType, "type" | "student" | "id">,
  ): void;
  allStudents?: Student[];
  uniqueStudents?: Student[];
};

export function TimelineItemContainer({
  items,
  setItems,
  onWantsToRemove,
  onWantsToUpdate,
  allStudents = [],
  uniqueStudents = [],
}: TimelineItemContainerProps) {
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
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);

      return arrayMove(current, oldIndex, newIndex);
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col-reverse gap-4">
          {items.map((item, idx) => (
            <TimelineItem
              key={idx}
              item={item}
              onWantsToRemove={onWantsToRemove}
              onWantsToUpdate={onWantsToUpdate}
              allStudents={allStudents}
              uniqueStudents={uniqueStudents}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
