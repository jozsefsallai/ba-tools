"use client";

import { FormationItem } from "@/app/formation-display/_components/formation-item";
import type { StudentItem } from "@/app/formation-display/_components/formation-preview";

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

export type FormationItemContainerProps = {
  items: StudentItem[];
  setItems: (
    items: StudentItem[] | ((items: StudentItem[]) => StudentItem[]),
  ) => void;
  onWantsToRemove(item: StudentItem): void;
  onWantsToUpdate(
    item: StudentItem,
    data: Omit<StudentItem, "student" | "id">,
  ): void;
};

export function FormationItemContainer({
  items,
  setItems,
  onWantsToRemove,
  onWantsToUpdate,
}: FormationItemContainerProps) {
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
        <div className="flex flex-col gap-4">
          {items.map((item, idx) => (
            <FormationItem
              key={idx}
              item={item}
              onWantsToRemove={onWantsToRemove}
              onWantsToUpdate={onWantsToUpdate}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
