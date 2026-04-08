"use client";

import { EmptyCard } from "@/components/common/empty-card";
import { StudentCard } from "@/components/common/student-card";
import { FormationItemPopover } from "@/app/formation-display/_components/formation-item-popover";
import { Popover, PopoverAnchor } from "@/components/ui/popover";
import type { StarLevel, Student, UELevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useCallback, useState, type RefObject, type SetStateAction } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type StudentItem = {
  id: string;
  student?: Student;
  starter?: boolean;
  starLevel?: StarLevel;
  ueLevel?: UELevel;
  borrowed?: boolean;
  level?: number;
};

export type EditableConfig = {
  selectedItemId: string | null;
  onItemSelected: (itemId: string | null) => void;
  setStrikers: React.Dispatch<SetStateAction<StudentItem[]>>;
  setSpecials: React.Dispatch<SetStateAction<StudentItem[]>>;
  onWantsToRemove: (itemId: string) => void;
  onWantsToUpdate: (
    itemId: string,
    data: Partial<Omit<StudentItem, "student" | "id">>,
  ) => void;
};

export type FormationPreviewProps = {
  containerRef?: RefObject<HTMLDivElement | null>;
  strikers: StudentItem[];
  specials: StudentItem[];
  displayOverline?: boolean;
  noDisplayRole?: boolean;
  groupsVertical?: boolean;
  editableConfig?: EditableConfig;
};

function Overline({
  color,
  hasStarter,
}: { color: string; hasStarter: boolean }) {
  return (
    <div
      className={cn(
        "w-[99%] h-[6px] rounded-t-[10px] skew-x-[-11deg] ml-[12px]",
        {
          "mt-[-1px]": !hasStarter,
        },
      )}
      style={{ backgroundColor: color }}
    />
  );
}

type SortablePreviewItemProps = {
  id: string;
  children: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
  onOpenChange: (open: boolean) => void;
  popoverContent: React.ReactNode;
};

function SortablePreviewItem({
  id,
  children,
  isSelected,
  onSelect,
  onOpenChange,
  popoverContent,
}: SortablePreviewItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    animateLayoutChanges: () => false,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <Popover open={isSelected} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <div
          ref={setNodeRef}
          data-formation-preview-anchor=""
          style={style}
          className="shrink-0 cursor-pointer"
          {...attributes}
          {...listeners}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          onKeyUp={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              onSelect();
            }
          }}
        >
          {children}
        </div>
      </PopoverAnchor>
      {popoverContent}
    </Popover>
  );
}

type SortableGroupProps = {
  items: StudentItem[];
  setItems: React.Dispatch<SetStateAction<StudentItem[]>>;
  noDisplayRole?: boolean;
  editableConfig: EditableConfig;
};

function SortableGroup({
  items,
  setItems,
  noDisplayRole,
  editableConfig,
}: SortableGroupProps) {
  const [, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      setActiveDragId(null);
      if (!over || active.id === over.id) return;
      setItems((current) => {
        const oldIndex = current.findIndex((item) => item.id === active.id);
        const newIndex = current.findIndex((item) => item.id === over.id);
        return arrayMove(current, oldIndex, newIndex);
      });
    },
    [setItems],
  );

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      editableConfig.onItemSelected(null);
      setActiveDragId(active.id as string);
    },
    [editableConfig],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  const { selectedItemId, onItemSelected, onWantsToRemove, onWantsToUpdate } =
    editableConfig;

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className="flex items-center gap-[2px]">
          {items.map((entry) => (
            <SortablePreviewItem
              key={entry.id}
              id={entry.id}
              isSelected={selectedItemId === entry.id}
              onSelect={() =>
                onItemSelected(
                  selectedItemId === entry.id ? null : entry.id,
                )
              }
              onOpenChange={(open) => {
                if (!open) onItemSelected(null);
              }}
              popoverContent={
                <FormationItemPopover
                  item={entry}
                  onWantsToRemove={onWantsToRemove}
                  onWantsToUpdate={onWantsToUpdate}
                />
              }
            >
              {entry.student ? (
                <StudentCard
                  noDisplayRole={noDisplayRole}
                  student={entry.student}
                  {...entry}
                />
              ) : (
                <EmptyCard />
              )}
            </SortablePreviewItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function FormationPreview({
  containerRef,
  strikers,
  specials,
  displayOverline,
  noDisplayRole,
  groupsVertical = false,
  editableConfig,
}: FormationPreviewProps) {
  const t = useTranslations();

  if (strikers.length === 0 && specials.length === 0) {
    return (
      <div className="border rounded-md px-4 py-10 text-center text-xl text-muted-foreground">
        {t("tools.formationDisplay.noStudentsInFormation")}
      </div>
    );
  }

  const strikersContent = (
    <div className="flex flex-col gap-1">
      {displayOverline && strikers.length > 0 && (
        <Overline
          color="#b63835"
          hasStarter={strikers.some((s) => s.starter)}
        />
      )}

      {editableConfig ? (
        <SortableGroup
          items={strikers}
          setItems={editableConfig.setStrikers}
          noDisplayRole={noDisplayRole}
          editableConfig={editableConfig}
        />
      ) : (
        <div className="flex items-center gap-[2px]">
          {strikers.map((entry) =>
            entry.student ? (
              <StudentCard
                key={entry.id}
                noDisplayRole={noDisplayRole}
                student={entry.student}
                {...entry}
              />
            ) : (
              <EmptyCard key={entry.id} />
            ),
          )}
        </div>
      )}
    </div>
  );

  const specialsContent = (
    <div className="flex flex-col gap-1">
      {displayOverline && specials.length > 0 && (
        <Overline
          color="#226fbc"
          hasStarter={specials.some((s) => s.starter)}
        />
      )}

      {editableConfig ? (
        <SortableGroup
          items={specials}
          setItems={editableConfig.setSpecials}
          noDisplayRole={noDisplayRole}
          editableConfig={editableConfig}
        />
      ) : (
        <div className="flex items-center gap-[2px]">
          {specials.map((entry) =>
            entry.student ? (
              <StudentCard
                key={entry.id}
                noDisplayRole={noDisplayRole}
                student={entry.student}
                {...entry}
              />
            ) : (
              <EmptyCard key={entry.id} />
            ),
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 items-center justify-center">
      <div
        className={cn("flex items-center gap-3 p-4", {
          "flex-col": groupsVertical,
        })}
        ref={containerRef}
      >
        {strikersContent}
        {specialsContent}
      </div>
    </div>
  );
}
