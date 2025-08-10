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
import type { SetStateAction } from "react";

export type TimelineItemContainerProps = {
  items: TimelineItemType[];
  setItems: React.Dispatch<SetStateAction<TimelineItemType[]>>;
  onWantsToRemove(item: TimelineItemType): void;
  onWantsToUpdate(
    item: TimelineItemType,
    data: Omit<TimelineItemType, "type" | "student" | "id">,
  ): void;
  addItemBelow?: (below: TimelineItemType, item: TimelineItemType) => void;
  allStudents?: Student[];
  uniqueStudents?: Student[];
  highlightedId?: string | null;
};

export function TimelineItemContainer({
  items,
  setItems,
  onWantsToRemove,
  onWantsToUpdate,
  addItemBelow,
  allStudents = [],
  uniqueStudents = [],
  highlightedId,
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
        <div className="flex flex-col-reverse gap-5">
          {items.map((item, idx) => (
            <TimelineItem
              key={idx}
              item={item}
              setItems={setItems}
              onWantsToRemove={onWantsToRemove}
              onWantsToUpdate={onWantsToUpdate}
              onWantsToAddBelow={addItemBelow}
              allStudents={allStudents}
              uniqueStudents={uniqueStudents}
              highlighted={highlightedId === item.id}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
