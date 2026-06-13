"use client";

import type { RosterItem } from "@/app/user/rosters/_components/roster-item-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { buildStudentIconUrl } from "@/lib/url";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  type Modifier,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type PropsWithChildren,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ReorderRosterDialogProps = PropsWithChildren & {
  rosterItems: RosterItem[];
  onReorder: (items: RosterItem[]) => void;
};

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

type SortableRosterRowProps = {
  rosterItem: RosterItem;
};

const SortableRosterRow = memo(function SortableRosterRow({
  rosterItem,
}: SortableRosterRowProps) {
  const t = useTranslations();
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
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };

  const iconUrl = useMemo(
    () => buildStudentIconUrl(rosterItem.student),
    [rosterItem.student],
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex cursor-grab touch-none items-center gap-2 rounded-md border bg-background px-2 py-1.5 active:cursor-grabbing"
      aria-label={t("tools.roster.editor.reorderStudent")}
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon className="size-4 shrink-0 text-muted-foreground" />

      <img
        src={iconUrl}
        alt={rosterItem.student.name}
        className="size-10 shrink-0 rounded-md"
      />

      <div className="min-w-0 flex-1 truncate text-sm">
        {rosterItem.student.name}
      </div>
    </div>
  );
});

export function ReorderRosterDialog({
  rosterItems,
  onReorder,
  children,
}: ReorderRosterDialogProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [draftItems, setDraftItems] = useState(rosterItems);

  useEffect(() => {
    if (open) {
      setDraftItems(rosterItems);
    }
  }, [open, rosterItems]);

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

  const sortableIds = useMemo(
    () => draftItems.map((item) => item.student.id),
    [draftItems],
  );

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }

    setDraftItems((current) => {
      const oldIndex = current.findIndex(
        (item) => item.student.id === active.id,
      );
      const newIndex = current.findIndex((item) => item.student.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return current;
      }

      return arrayMove(current, oldIndex, newIndex);
    });
  }, []);

  function handleDone() {
    onReorder(draftItems);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("tools.roster.editor.reorderStudents.title")}
          </DialogTitle>
          <DialogDescription>
            {t("tools.roster.editor.reorderStudents.description")}
          </DialogDescription>
        </DialogHeader>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex max-h-[min(60vh,32rem)] flex-col gap-2 overflow-y-auto pr-1">
              {draftItems.map((item) => (
                <SortableRosterRow key={item.student.id} rosterItem={item} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <DialogFooter>
          <Button type="button" onClick={handleDone}>
            {t("tools.roster.editor.reorderStudents.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
