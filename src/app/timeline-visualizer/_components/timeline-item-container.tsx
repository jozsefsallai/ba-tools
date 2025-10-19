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
import { useCallback, type SetStateAction } from "react";

export type TimelineItemContainerProps = {
  items: TimelineItemType[];
  setItems: React.Dispatch<SetStateAction<TimelineItemType[]>>;
  onWantsToRemove(itemId: string): void;
  onWantsToUpdate(
    itemId: string,
    data: Omit<TimelineItemType, "type" | "student" | "id">,
  ): void;
  addItemBelow?: (belowId: string, item: TimelineItemType) => void;
  uniqueStudents?: Student[];
  highlightedId?: string | null;
  onTriggerKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocusOnTriggerField?: boolean;
};

export function TimelineItemContainer({
  items,
  setItems,
  onWantsToRemove,
  onWantsToUpdate,
  addItemBelow,
  uniqueStudents = [],
  highlightedId,
  onTriggerKeyDown,
  autoFocusOnTriggerField,
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

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) {
        return;
      }

      setItems((current) => {
        const oldIndex = current.findIndex((item) => item.id === active.id);
        const newIndex = current.findIndex((item) => item.id === over.id);

        return arrayMove(current, oldIndex, newIndex);
      });
    },
    [setItems],
  );

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
              uniqueStudents={uniqueStudents}
              highlighted={highlightedId === item.id}
              onTriggerKeyDown={onTriggerKeyDown}
              autoFocusOnTriggerField={autoFocusOnTriggerField}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
