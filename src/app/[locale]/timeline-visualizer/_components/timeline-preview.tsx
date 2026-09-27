"use client";

import { StudentCard } from "@/components/common/student-card";
import {
  type ReactNode,
  type RefObject,
  type SetStateAction,
  useCallback,
  useState,
} from "react";
import type { Student } from "~prisma";

import { TimelineItemPopover } from "@/app/[locale]/timeline-visualizer/_components/timeline-item-popover";
import { TimelinePreviewTrigger } from "@/app/[locale]/timeline-visualizer/_components/timeline-preview-trigger";
import skillcardCopyGlow from "@/assets/images/skillcard_copy_glow.png";
import { Popover, PopoverAnchor } from "@/components/ui/popover";
import { buildSkillPortraitUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
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
import { CornerRightDownIcon, MoveHorizontalIcon } from "lucide-react";
import { useTranslations } from "next-intl";

type BaseItem = {
  type: "student" | "separator" | "text";
  id: string;
};

export type StudentItem = BaseItem & {
  type: "student";
  student: Student;
  trigger?: string;
  target?: Student;
  extraTargets?: Array<Student | undefined>;
  copy?: boolean;
  variantId?: string;
  notes?: string;
};

export type SeparatorItem = BaseItem & {
  type: "separator";
  orientation: "horizontal" | "vertical";
  size?: number;
};

export type TextItem = BaseItem & {
  type: "text";
  text: string;
};

export type TimelineItem = StudentItem | SeparatorItem | TextItem;

export type EditableConfig = {
  selectedItemId: string | null;
  onItemSelected: (itemId: string | null) => void;
  setItems: React.Dispatch<SetStateAction<TimelineItem[]>>;
  onWantsToRemove: (itemId: string) => void;
  onWantsToUpdate: (
    itemId: string,
    data: Omit<TimelineItem, "type" | "student" | "id">,
  ) => void;
  uniqueStudents: Student[];
  onTriggerKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  /** When set, student popover should focus the trigger field once then clear via callback */
  focusTriggerFieldItemId: string | null;
  onFocusTriggerFieldConsumed: () => void;
  /** When set, text popover should focus and select the text field once then clear via callback */
  focusTextFieldItemId: string | null;
  onFocusTextFieldConsumed: () => void;
};

export type TimelinePreviewProps = {
  containerRef?: RefObject<HTMLDivElement | null>;
  items: TimelineItem[];
  itemSpacing?: number;
  verticalSeparatorSize?: number;
  horizontalSeparatorSize?: number;
  busy?: boolean;
  onItemClicked?: (item: TimelineItem) => void;
  editableConfig?: EditableConfig;
};

const TARGET_BOX_WIDTH_PX = 93;
const TARGET_BOX_HEIGHT_PX = 86;
const TARGET_BOX_SPACING_PX = 70;

function TargetTile({ student }: { student: Student }) {
  return (
    <div
      className={cn(
        "relative min-h-0 min-w-0 overflow-hidden border border-white/80",
        {
          "bg-type-red": student.attackType === "Explosion",
          "bg-type-yellow": student.attackType === "Pierce",
          "bg-type-blue": student.attackType === "Mystic",
          "bg-type-purple": student.attackType === "Sonic",
          "bg-type-green": student.attackType === "Chemical",
        },
      )}
    >
      <img
        src={buildSkillPortraitUrl(student)}
        alt={student.name}
        className="absolute inset-0 h-full w-full object-cover object-center skew-x-[11deg] scale-x-[1.08]"
      />
    </div>
  );
}

function TargetBox({ targets }: { targets: Student[] }) {
  const isStack = targets.length <= 3;

  return (
    <div
      className="skew-x-[-11deg] rounded-[2px] bg-black p-[2px] dark:bg-white"
      style={{
        width: TARGET_BOX_WIDTH_PX,
        height: TARGET_BOX_HEIGHT_PX,
      }}
    >
      <div
        className={cn("grid h-full w-full overflow-hidden", {
          "grid-cols-1": isStack,
          "grid-rows-1": targets.length === 1,
          "grid-rows-2": targets.length === 2,
          "grid-rows-3": targets.length === 3,
          "grid-cols-2 grid-rows-2": targets.length === 4,
          "grid-cols-2 grid-rows-3": targets.length > 4,
        })}
      >
        {targets.map((target) => (
          <TargetTile key={target.id} student={target} />
        ))}
      </div>
    </div>
  );
}

type SortablePreviewItemProps = {
  id: string;
  children: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
  onOpenChange: (open: boolean) => void;
  popoverContent: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Vertical separator in editor: narrow VS handle; gap row is a following sibling */
  editorVerticalSeparator?: {
    handleWidthPx: number;
    gapHeightPx: number;
    hideDragHandle: boolean;
  };
};

type SeparatorHandleProps = React.ComponentProps<"div"> & {
  size?: SeparatorItem["size"];
};

function SeparatorHandle({
  size = 16,
  className,
  ...props
}: SeparatorHandleProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 cursor-grab items-center justify-center rounded-[11%] border border-dashed border-muted-foreground/45 bg-background/90 font-bold text-muted-foreground shadow-sm skew-x-[-11deg] active:cursor-grabbing h-[88px]",
        className,
      )}
      style={{
        width: size,
      }}
      {...props}
    />
  );
}

function SortablePreviewItem({
  id,
  children,
  isSelected,
  onSelect,
  onOpenChange,
  popoverContent,
  className,
  style: extraStyle,
  editorVerticalSeparator,
}: SortablePreviewItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    animateLayoutChanges: () => false,
  });

  const style: React.CSSProperties = {
    ...extraStyle,
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };

  if (editorVerticalSeparator) {
    const { handleWidthPx, gapHeightPx, hideDragHandle } =
      editorVerticalSeparator;

    if (hideDragHandle) {
      return (
        <Popover open={isSelected} onOpenChange={onOpenChange}>
          <PopoverAnchor asChild>
            <div
              ref={setNodeRef}
              data-timeline-preview-anchor=""
              style={{
                ...extraStyle,
                flexBasis: "100%",
                width: "100%",
                minWidth: "100%",
                opacity: isDragging ? 0 : 1,
              }}
              className={cn("flex shrink-0 flex-col", className)}
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
              <div
                className="w-full shrink-0"
                style={{ height: gapHeightPx }}
                aria-hidden
              />
            </div>
          </PopoverAnchor>
          {popoverContent}
        </Popover>
      );
    }

    return (
      <Popover open={isSelected} onOpenChange={onOpenChange}>
        <PopoverAnchor asChild>
          <div
            ref={setNodeRef}
            data-timeline-preview-anchor=""
            style={{
              ...extraStyle,
              opacity: isDragging ? 0 : 1,
            }}
            className={cn(
              "relative z-10 inline-flex shrink-0 flex-col self-start",
              className,
            )}
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
            <SeparatorHandle
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              size={handleWidthPx}
            >
              <span className="skew-x-[11deg] select-none text-[10px]">
                <CornerRightDownIcon />
              </span>
            </SeparatorHandle>
          </div>
        </PopoverAnchor>
        {popoverContent}
      </Popover>
    );
  }

  return (
    <Popover open={isSelected} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <div
          ref={setNodeRef}
          data-timeline-preview-anchor=""
          style={style}
          className={cn("shrink-0", className)}
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

export function TimelinePreview({
  containerRef,
  items,
  itemSpacing = 10,
  verticalSeparatorSize = 20,
  horizontalSeparatorSize = 20,
  busy = false,
  onItemClicked,
  editableConfig,
}: TimelinePreviewProps) {
  const t = useTranslations();

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

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
      setActiveDragId(null);
      if (!over || active.id === over.id || !editableConfig) return;
      editableConfig.setItems((current) => {
        const oldIndex = current.findIndex((item) => item.id === active.id);
        const newIndex = current.findIndex((item) => item.id === over.id);
        return arrayMove(current, oldIndex, newIndex);
      });
    },
    [editableConfig],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      editableConfig?.onItemSelected(null);
      setActiveDragId(active.id as string);
    },
    [editableConfig],
  );

  const activeDragItem = activeDragId
    ? items.find((i) => i.id === activeDragId)
    : null;
  const separatorDragOverlayOrientation =
    activeDragItem?.type === "separator" ? activeDragItem.orientation : null;

  const handleItemClicked = useCallback(
    (item: TimelineItem) => {
      return () => {
        onItemClicked?.(item);
      };
    },
    [onItemClicked],
  );

  const handleItemKeyUp = useCallback(
    (item: TimelineItem) => {
      return (event: React.KeyboardEvent) => {
        if (event.key === "Enter") {
          onItemClicked?.(item);
        }
      };
    },
    [onItemClicked],
  );

  if (items.length === 0) {
    return (
      <div className="border rounded-md px-4 py-10 text-center text-xl text-muted-foreground">
        {t("tools.timeline.empty")}
      </div>
    );
  }

  function renderItemContent(item: TimelineItem) {
    if (item.type === "student") {
      const targets = [item.target, ...(item.extraTargets ?? [])].filter(
        (target): target is Student => !!target,
      );

      const targetGroups =
        targets.length > 4
          ? [targets.slice(0, 4), targets.slice(4)]
          : targets.length > 0
            ? [targets]
            : [];

      const hasCompactTargetBox = targetGroups.some(
        (group) => group.length > 1,
      );

      const renderTargetGroup = (group: Student[], index: number) =>
        group.length === 1 ? (
          <StudentCard
            key={`target-group-${index}`}
            isSkillCard
            noDisplayRole
            student={group[0]}
          />
        ) : (
          <TargetBox key={`target-group-${index}`} targets={group} />
        );
      return (
        <>
          <div className="relative">
            {targetGroups.length > 0 && (
              <>
                <div
                  className={cn("absolute left-1/2 -translate-x-1/2", {
                    "-bottom-[74px] -ml-3": hasCompactTargetBox,
                    "-bottom-14 -ml-2": !hasCompactTargetBox,
                  })}
                >
                  <div className="scale-75">
                    {renderTargetGroup(targetGroups[0], 0)}
                  </div>
                </div>

                {targetGroups[1] && (
                  <div className="absolute left-full top-1/2 -translate-y-[32px]">
                    <div className="origin-top-left scale-75">
                      {renderTargetGroup(targetGroups[1], 1)}
                    </div>
                  </div>
                )}
              </>
            )}

            <StudentCard
              isSkillCard
              noDisplayRole
              student={item.student}
              variantId={item.variantId}
            />

            {item.copy && (
              <img
                src={skillcardCopyGlow.src}
                alt=""
                className="absolute top-0 left-0 right-0 bottom-0 skew-x-[-11deg]"
              />
            )}

            {item.trigger && item.trigger.trim().length > 0 && (
              <TimelinePreviewTrigger trigger={item.trigger} busy={busy} />
            )}
          </div>

          {item.notes && item.notes.trim().length > 0 && (
            <div
              className={cn(
                "font-nexon-football-gothic font-bold text-sm text-white px-3 -ml-6 whitespace-pre-wrap text-center",
                {
                  "mt-2": targets.length === 0,
                  "mt-12": targets.length > 0,
                },
              )}
              style={{
                textShadow:
                  "-1px -1px 0 rgba(0, 0, 0, 0.5), 1px -1px 0 rgba(0, 0, 0, 0.5), -1px 1px 0 rgba(0, 0, 0, 0.5), 1px 1px 0 rgba(0, 0, 0, 0.5)",
              }}
            >
              {item.notes}
            </div>
          )}
        </>
      );
    }

    if (item.type === "separator") {
      if (editableConfig) {
        if (item.orientation === "vertical") {
          return null;
        }

        if (busy) {
          return null;
        }

        return (
          <SeparatorHandle
            size={horizontalSeparatorSize}
            className="box-border w-full min-w-0"
          >
            <span className="skew-x-[11deg] select-none text-[10px]">
              <MoveHorizontalIcon />
            </span>
          </SeparatorHandle>
        );
      }

      return null;
    }

    if (item.type === "text" && item.text.trim().length > 0) {
      return <>{item.text}</>;
    }

    if (item.type === "text") {
      return <>(No Text)</>;
    }

    return null;
  }

  function getItemStyle(item: TimelineItem, idx: number): React.CSSProperties {
    if (item.type === "student") {
      const previousItem = idx > 0 ? items[idx - 1] : undefined;

      const previousTargetCount =
        previousItem?.type === "student"
          ? [previousItem.target, ...(previousItem.extraTargets ?? [])].filter(
              Boolean,
            ).length
          : 0;

      return {
        marginLeft:
          idx === 0 || items[idx - 1].type !== "student"
            ? undefined
            : `${
                itemSpacing +
                (previousTargetCount > 4 ? TARGET_BOX_SPACING_PX : 0)
              }px`,
      };
    }

    if (item.type === "separator") {
      if (item.orientation === "vertical" && editableConfig) {
        return {};
      }
      return {
        width:
          item.orientation === "horizontal"
            ? `${item.size ?? horizontalSeparatorSize}px`
            : undefined,
        height:
          item.orientation === "vertical"
            ? `${item.size ?? verticalSeparatorSize}px`
            : undefined,
        flexBasis: item.orientation === "vertical" ? "100%" : undefined,
        minHeight:
          item.orientation === "horizontal" && editableConfig
            ? "88px"
            : undefined,
      };
    }

    return {};
  }

  function getItemClassName(item: TimelineItem): string {
    if (item.type === "student") {
      return "cursor-pointer flex flex-col items-center";
    }

    if (item.type === "separator") {
      return "cursor-pointer";
    }

    if (item.type === "text") {
      return "text-center whitespace-pre-wrap h-[88px] flex items-center font-nexon-football-gothic font-bold text-lg text-white px-3 cursor-pointer";
    }

    return "";
  }

  function getTextStyle(): React.CSSProperties {
    return {
      textShadow:
        "-1px -1px 0 rgba(0, 0, 0, 0.5), 1px -1px 0 rgba(0, 0, 0, 0.5), -1px 1px 0 rgba(0, 0, 0, 0.5), 1px 1px 0 rgba(0, 0, 0, 0.5)",
    };
  }

  const itemElements = items.flatMap((item, idx): ReactNode[] => {
    const content = renderItemContent(item);
    if (content === null && item.type !== "separator") return [];

    const itemStyle: React.CSSProperties = {
      ...getItemStyle(item, idx),
      ...(item.type === "text" ? getTextStyle() : {}),
    };
    const itemClassName = getItemClassName(item);

    if (editableConfig) {
      const {
        selectedItemId,
        onItemSelected,
        setItems,
        onWantsToRemove,
        onWantsToUpdate,
        uniqueStudents,
        onTriggerKeyDown,
        focusTriggerFieldItemId,
        onFocusTriggerFieldConsumed,
        focusTextFieldItemId,
        onFocusTextFieldConsumed,
      } = editableConfig;

      const isEditableVerticalSeparator =
        item.type === "separator" && item.orientation === "vertical";

      const row: React.ReactNode[] = [
        <SortablePreviewItem
          key={item.id}
          id={item.id}
          className={itemClassName}
          style={itemStyle}
          isSelected={selectedItemId === item.id}
          onSelect={() =>
            onItemSelected(selectedItemId === item.id ? null : item.id)
          }
          onOpenChange={(open) => {
            if (!open) onItemSelected(null);
          }}
          editorVerticalSeparator={
            isEditableVerticalSeparator && item.type === "separator"
              ? {
                  handleWidthPx: horizontalSeparatorSize,
                  gapHeightPx: item.size ?? verticalSeparatorSize,
                  hideDragHandle: busy,
                }
              : undefined
          }
          popoverContent={
            <TimelineItemPopover
              item={item}
              setItems={setItems}
              onWantsToRemove={onWantsToRemove}
              onWantsToUpdate={onWantsToUpdate}
              uniqueStudents={uniqueStudents}
              onTriggerKeyDown={onTriggerKeyDown}
              autoFocusTrigger={focusTriggerFieldItemId === item.id}
              onAutoFocusTriggerConsumed={onFocusTriggerFieldConsumed}
              autoFocusText={focusTextFieldItemId === item.id}
              onAutoFocusTextConsumed={onFocusTextFieldConsumed}
            />
          }
        >
          {isEditableVerticalSeparator ? null : content}
        </SortablePreviewItem>,
      ];

      if (isEditableVerticalSeparator && !busy) {
        const vsGapPx = item.size ?? verticalSeparatorSize;
        row.push(
          <div
            key={`${item.id}__vs-row-gap`}
            aria-hidden
            className="shrink-0"
            style={{
              flexBasis: "100%",
              width: "100%",
              height: vsGapPx,
            }}
          />,
        );
      }

      return row;
    }

    return [
      <div
        key={item.id}
        className={cn("shrink-0", itemClassName)}
        style={itemStyle}
        onClick={handleItemClicked(item)}
        onKeyUp={handleItemKeyUp(item)}
      >
        {content}
      </div>,
    ];
  });

  const previewContent = (
    <div className="flex flex-col gap-4 items-start justify-center">
      <div className="flex items-center gap-3 px-4 py-18" ref={containerRef}>
        <div className="flex flex-col gap-1">
          <div className="relative flex flex-wrap items-start">
            {itemElements}
          </div>
        </div>
      </div>
    </div>
  );

  if (editableConfig) {
    return (
      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        onDragStart={handleDragStart}
      >
        <SortableContext items={items} strategy={rectSortingStrategy}>
          {previewContent}
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {separatorDragOverlayOrientation && (
            <SeparatorHandle
              className={cn("cursor-grabbing bg-background/95 shadow-md")}
              size={horizontalSeparatorSize}
            >
              <span className="skew-x-[11deg] select-none text-[10px]">
                {separatorDragOverlayOrientation === "horizontal" ? (
                  <MoveHorizontalIcon />
                ) : (
                  <CornerRightDownIcon />
                )}
              </span>
            </SeparatorHandle>
          )}
        </DragOverlay>
      </DndContext>
    );
  }

  return previewContent;
}
