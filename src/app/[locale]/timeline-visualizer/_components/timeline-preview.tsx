"use client";

import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  ArrowLeftToLineIcon,
  ArrowRightToLineIcon,
  CopyPlusIcon,
  CornerRightDownIcon,
  MoveHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  memo,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { TimelineItemPopover } from "@/app/[locale]/timeline-visualizer/_components/timeline-item-popover";
import { TimelinePreviewTrigger } from "@/app/[locale]/timeline-visualizer/_components/timeline-preview-trigger";
import {
  type ActiveDrag,
  useTimelineDrag,
} from "@/app/[locale]/timeline-visualizer/_hooks/use-timeline-drag";
import { useTimelineSelection } from "@/app/[locale]/timeline-visualizer/_hooks/use-timeline-selection";
import skillcardCopyGlow from "@/assets/images/skillcard_copy_glow.png";
import { StudentCard } from "@/components/common/student-card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Popover, PopoverAnchor } from "@/components/ui/popover";
import { useStudents } from "@/hooks/use-students";
import { preventTouchContextMenu, TOUCH_DRAG_CLASS } from "@/lib/dnd-mobile";
import {
  deserializeTimelineItems,
  serializeTimelineItems,
} from "@/lib/timeline-items";
import {
  duplicateGroup,
  moveGroupToEdge,
  nudgeGroup,
  placeHeldRowBreaks,
  removeGroup,
} from "@/lib/timeline-selection";
import { serializeTimelineToText } from "@/lib/timeline-text-format";
import { buildSkillPortraitUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { Student } from "~prisma";

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

export type TimelineInsertKind = "horizontal" | "vertical" | "text";

export type EditableConfig = {
  selectedItemId: string | null;
  onItemSelected: (itemId: string | null) => void;
  setItems: React.Dispatch<SetStateAction<TimelineItem[]>>;
  onWantsToRemove: (itemId: string) => void;
  onWantsToUpdate: (
    itemId: string,
    data: Omit<TimelineItem, "type" | "student" | "id">,
  ) => void;
  onWantsToInsertAfter: (itemId: string, kind: TimelineInsertKind) => void;
  onUndo: () => void;
  onRedo: () => void;
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
  exportHeader?: ReactNode;
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
  onSelect: (event?: React.MouseEvent) => void;
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

function useHorizontalOverflow(el: HTMLDivElement | null) {
  const [overflow, setOverflow] = useState({
    left: false,
    right: false,
  });

  useEffect(() => {
    if (!el) {
      return;
    }

    const update = () => {
      const left = el.scrollLeft > 1;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;

      setOverflow((prev) =>
        prev.left === left && prev.right === right
          ? prev
          : {
              left,
              right,
            },
      );
    };

    update();

    el.addEventListener("scroll", update, {
      passive: true,
    });

    const observer = new ResizeObserver(update);
    observer.observe(el);

    if (el.firstElementChild) {
      observer.observe(el.firstElementChild);
    }

    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [
    el,
  ]);

  return overflow;
}

const PREVIEW_ZOOM_CLASS = "max-md:[zoom:0.75]";
const MAX_PILE_CARDS = 4;
const DRAG_LIFT_SCALE = 1.04;
const DRAG_LIFT_MS = 120;

const SELECTED_ITEM_CLASS =
  "[filter:drop-shadow(2px_0_0_var(--color-sky-400))_drop-shadow(-2px_0_0_var(--color-sky-400))_drop-shadow(0_2px_0_var(--color-sky-400))_drop-shadow(0_-2px_0_var(--color-sky-400))_drop-shadow(0_0_6px_var(--color-sky-400))]";
const TIMELINE_CLIPBOARD_TYPE = "web application/x-ba-tools-timeline-items";

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
  const { attributes, listeners, setNodeRef, setActivatorNodeRef } =
    useDraggable({
      id,
    });

  if (editorVerticalSeparator) {
    const { handleWidthPx, gapHeightPx, hideDragHandle } =
      editorVerticalSeparator;

    if (hideDragHandle) {
      return (
        <Popover open={isSelected} onOpenChange={onOpenChange}>
          <PopoverAnchor asChild>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: wrapper catches clicks and Enter bubbling up from the focusable drag handle inside */}
            <div
              ref={setNodeRef}
              data-timeline-preview-anchor={id}
              style={{
                ...extraStyle,
                flexBasis: "100%",
                width: "100%",
                minWidth: "100%",
              }}
              className={cn("flex shrink-0 flex-col", className)}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(e);
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
                style={{
                  height: gapHeightPx,
                }}
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
          {/* biome-ignore lint/a11y/noStaticElementInteractions: wrapper catches clicks and Enter bubbling up from the focusable drag handle inside */}
          <div
            ref={setNodeRef}
            data-timeline-preview-anchor={id}
            style={extraStyle}
            className={cn(
              "relative z-10 inline-flex shrink-0 flex-col self-start max-md:align-top",
              TOUCH_DRAG_CLASS,
              className,
            )}
            onContextMenu={preventTouchContextMenu}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(e);
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
        {/* biome-ignore lint/a11y/noStaticElementInteractions: dnd-kit's spread `attributes` give this sortable role="button" and tabIndex at runtime */}
        <div
          ref={setNodeRef}
          data-timeline-preview-anchor={id}
          style={extraStyle}
          className={cn("shrink-0", TOUCH_DRAG_CLASS, className)}
          {...attributes}
          {...listeners}
          onContextMenu={preventTouchContextMenu}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(e);
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

const NO_STUDENTS: Student[] = [];

const DND_MEASURING = {
  draggable: {
    measure: () => ({
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
    }),
  },
};

const TEXT_ITEM_STYLE: React.CSSProperties = {
  textShadow:
    "-1px -1px 0 rgba(0, 0, 0, 0.5), 1px -1px 0 rgba(0, 0, 0, 0.5), -1px 1px 0 rgba(0, 0, 0, 0.5), 1px 1px 0 rgba(0, 0, 0, 0.5)",
};

function getItemMarginLeft(
  item: TimelineItem,
  previousItem: TimelineItem | undefined,
  itemSpacing: number,
) {
  if (item.type !== "student" || previousItem?.type !== "student") {
    return undefined;
  }

  const previousTargetCount = [
    previousItem.target,
    ...(previousItem.extraTargets ?? []),
  ].filter(Boolean).length;

  return itemSpacing + (previousTargetCount > 4 ? TARGET_BOX_SPACING_PX : 0);
}

function getItemStyle(
  item: TimelineItem,
  marginLeft: number | undefined,
  horizontalSeparatorSize: number,
  verticalSeparatorSize: number,
  editable: boolean,
): React.CSSProperties {
  if (item.type === "student") {
    return {
      marginLeft,
    };
  }

  if (item.type === "text") {
    return TEXT_ITEM_STYLE;
  }

  if (item.orientation === "vertical" && editable) {
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
      item.orientation === "horizontal" && editable ? "88px" : undefined,
  };
}

function getItemClassName(item: TimelineItem): string {
  if (item.type === "student") {
    return "cursor-pointer flex flex-col items-center max-md:inline-flex max-md:align-top";
  }

  if (item.type === "separator") {
    return item.orientation === "horizontal"
      ? "cursor-pointer max-md:inline-block max-md:align-top"
      : "cursor-pointer";
  }

  return "text-center whitespace-pre-wrap h-[88px] flex items-center font-nexon-football-gothic font-bold text-lg text-white px-3 cursor-pointer max-md:inline-flex max-md:align-top";
}

type TimelineItemContentProps = {
  item: TimelineItem;
  busy: boolean;
  editable: boolean;
  horizontalSeparatorSize: number;
};

/** The card art: the expensive part, so it only renders when its item changes. */
const TimelineItemContent = memo(function TimelineItemContent({
  item,
  busy,
  editable,
  horizontalSeparatorSize,
}: TimelineItemContentProps) {
  if (item.type === "student") {
    const targets = [
      item.target,
      ...(item.extraTargets ?? []),
    ].filter((target): target is Student => !!target);

    const targetGroups =
      targets.length > 4
        ? [
            targets.slice(0, 4),
            targets.slice(4),
          ]
        : targets.length > 0
          ? [
              targets,
            ]
          : [];

    const hasCompactTargetBox = targetGroups.some((group) => group.length > 1);

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
    if (editable) {
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
});

function TimelineRowBreak({ height }: { height: number }) {
  return (
    <div
      aria-hidden
      className="shrink-0"
      style={{
        flexBasis: "100%",
        width: "100%",
        height,
      }}
    />
  );
}

type TimelineItemActions = {
  onSelect: (itemId: string, event?: React.MouseEvent) => void;
  onOpenChange: (open: boolean) => void;
  setItems: React.Dispatch<SetStateAction<TimelineItem[]>>;
  onWantsToRemove: EditableConfig["onWantsToRemove"];
  onWantsToUpdate: EditableConfig["onWantsToUpdate"];
  onWantsToInsertAfter: EditableConfig["onWantsToInsertAfter"];
  onTriggerKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocusTriggerFieldConsumed: () => void;
  onFocusTextFieldConsumed: () => void;
};

type EditableTimelineItemProps = {
  item: TimelineItem;
  marginLeft: number | undefined;
  isOpen: boolean;
  isInGroup: boolean;
  isDragged: boolean;
  heldBreakHeight: number | undefined;
  busy: boolean;
  horizontalSeparatorSize: number;
  verticalSeparatorSize: number;
  uniqueStudents: Student[];
  autoFocusTrigger: boolean;
  autoFocusText: boolean;
  actions: TimelineItemActions;
};

const EditableTimelineItem = memo(function EditableTimelineItem({
  item,
  marginLeft,
  isOpen,
  isInGroup,
  isDragged,
  heldBreakHeight,
  busy,
  horizontalSeparatorSize,
  verticalSeparatorSize,
  uniqueStudents,
  autoFocusTrigger,
  autoFocusText,
  actions,
}: EditableTimelineItemProps) {
  const isVerticalSeparator =
    item.type === "separator" && item.orientation === "vertical";

  return (
    <>
      <SortablePreviewItem
        id={item.id}
        className={cn(
          getItemClassName(item),
          "transition-opacity duration-150",
          isInGroup && SELECTED_ITEM_CLASS,
          isDragged && "opacity-60",
        )}
        style={getItemStyle(
          item,
          marginLeft,
          horizontalSeparatorSize,
          verticalSeparatorSize,
          true,
        )}
        isSelected={isOpen}
        onSelect={(event) => actions.onSelect(item.id, event)}
        onOpenChange={actions.onOpenChange}
        editorVerticalSeparator={
          isVerticalSeparator
            ? {
                handleWidthPx: horizontalSeparatorSize,
                gapHeightPx:
                  (item.type === "separator" ? item.size : undefined) ??
                  verticalSeparatorSize,
                hideDragHandle: busy,
              }
            : undefined
        }
        popoverContent={
          isOpen ? (
            <TimelineItemPopover
              item={item}
              setItems={actions.setItems}
              onWantsToRemove={actions.onWantsToRemove}
              onWantsToUpdate={actions.onWantsToUpdate}
              onWantsToInsertAfter={actions.onWantsToInsertAfter}
              uniqueStudents={uniqueStudents}
              onTriggerKeyDown={actions.onTriggerKeyDown}
              autoFocusTrigger={autoFocusTrigger}
              onAutoFocusTriggerConsumed={actions.onFocusTriggerFieldConsumed}
              autoFocusText={autoFocusText}
              onAutoFocusTextConsumed={actions.onFocusTextFieldConsumed}
            />
          ) : null
        }
      >
        {isVerticalSeparator ? null : (
          <TimelineItemContent
            item={item}
            busy={busy}
            editable
            horizontalSeparatorSize={horizontalSeparatorSize}
          />
        )}
      </SortablePreviewItem>

      {/* While dragged, a separator is an inline handle, and its row break stays
          behind until the drop, so picking one up never moves the layout. */}
      {isVerticalSeparator && !busy && !isDragged && (
        <TimelineRowBreak
          height={
            (item.type === "separator" ? item.size : undefined) ??
            verticalSeparatorSize
          }
        />
      )}

      {heldBreakHeight !== undefined && (
        <TimelineRowBreak height={heldBreakHeight} />
      )}
    </>
  );
});

function DragPreviewCard({
  item,
  horizontalSeparatorSize,
}: {
  item: TimelineItem;
  horizontalSeparatorSize: number;
}) {
  if (item.type === "separator") {
    return (
      <SeparatorHandle
        className="bg-background/95"
        size={horizontalSeparatorSize}
      >
        <span className="skew-x-[11deg] select-none text-[10px]">
          {item.orientation === "horizontal" ? (
            <MoveHorizontalIcon />
          ) : (
            <CornerRightDownIcon />
          )}
        </span>
      </SeparatorHandle>
    );
  }

  return (
    <div
      className={cn(getItemClassName(item), "w-fit")}
      style={item.type === "text" ? TEXT_ITEM_STYLE : undefined}
    >
      <TimelineItemContent
        item={item}
        busy={false}
        editable
        horizontalSeparatorSize={horizontalSeparatorSize}
      />
    </div>
  );
}

function pileOffset(position: number) {
  return `translate(${position * 8}px, ${position * 6}px)`;
}

type TimelineDragOverlayProps = {
  drag: ActiveDrag;
  items: TimelineItem[];
  overlayRef: RefObject<HTMLDivElement | null>;
  horizontalSeparatorSize: number;
};

function TimelineDragOverlay({
  drag,
  items,
  overlayRef,
  horizontalSeparatorSize,
}: TimelineDragOverlayProps) {
  const liftRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    liftRef.current?.animate(
      [
        {
          transform: "scale(1)",
        },
        {
          transform: `scale(${DRAG_LIFT_SCALE})`,
        },
      ],
      {
        duration: DRAG_LIFT_MS,
        easing: "ease-out",
        fill: "forwards",
      },
    );

    for (const card of liftRef.current?.querySelectorAll<HTMLElement>(
      "[data-drag-pile-card]",
    ) ?? []) {
      card.animate(
        [
          {
            transform: "translate(0, 0)",
          },
          {
            transform: card.style.transform,
          },
        ],
        {
          duration: DRAG_LIFT_MS,
          easing: "ease-out",
        },
      );
    }
  }, []);

  const lead = items.find((item) => item.id === drag.activeId);
  if (!lead) {
    return null;
  }

  const others = items
    .filter((item) => drag.groupIds.has(item.id) && item.id !== lead.id)
    .slice(0, MAX_PILE_CARDS - 1);

  return (
    <div
      ref={overlayRef}
      className="pointer-events-none fixed left-0 top-0 z-50 cursor-grabbing will-change-transform"
    >
      <div
        ref={liftRef}
        data-drag-lift=""
        className={cn("relative w-fit drop-shadow-xl", PREVIEW_ZOOM_CLASS)}
      >
        {others.toReversed().map((item, index) => (
          <div
            key={item.id}
            data-drag-pile-card=""
            className="absolute left-0 top-0 opacity-80"
            style={{
              transform: pileOffset(others.length - index),
            }}
          >
            <DragPreviewCard
              item={item}
              horizontalSeparatorSize={horizontalSeparatorSize}
            />
          </div>
        ))}

        <div className="relative">
          <DragPreviewCard
            item={lead}
            horizontalSeparatorSize={horizontalSeparatorSize}
          />
        </div>

        {drag.groupIds.size > 1 && (
          <span
            data-drag-pile-card=""
            className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground shadow-md"
          >
            {drag.groupIds.size}
          </span>
        )}
      </div>
    </div>
  );
}

export function TimelinePreview({
  containerRef,
  items,
  itemSpacing = 10,
  verticalSeparatorSize = 20,
  horizontalSeparatorSize = 20,
  busy = false,
  exportHeader,
  onItemClicked,
  editableConfig,
}: TimelinePreviewProps) {
  const t = useTranslations();

  const { students: allStudents } = useStudents();

  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  useEffect(() => {
    setIsCoarsePointer(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const itemIds = useMemo(
    () => items.map((item) => item.id),
    [
      items,
    ],
  );
  const {
    groupIds,
    setGroup,
    clearGroup,
    handleModifierClick,
    handleContainerPointerDown,
    marquee,
  } = useTimelineSelection(itemIds);

  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const overflow = useHorizontalOverflow(scroller);

  const previousItemCount = useRef(items.length);
  const previousLastItemId = useRef(items.at(-1)?.id);
  const lastItemId = items.at(-1)?.id;

  useEffect(() => {
    const added =
      items.length === previousItemCount.current + 1 &&
      lastItemId !== previousLastItemId.current;
    previousItemCount.current = items.length;
    previousLastItemId.current = lastItemId;

    const last = Array.from(
      scroller?.querySelectorAll("[data-timeline-preview-anchor]") ?? [],
    ).at(-1);

    if (!added || !scroller || !last) {
      return;
    }

    if (scroller.scrollWidth <= scroller.clientWidth) {
      return;
    }

    const itemRect = last.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();

    if (itemRect.right > scrollerRect.right) {
      scroller.scrollBy({
        left: itemRect.right - scrollerRect.right + 16,
        behavior: "smooth",
      });
    } else if (itemRect.left < scrollerRect.left) {
      scroller.scrollBy({
        left: itemRect.left - scrollerRect.left - 16,
        behavior: "smooth",
      });
    }
  }, [
    items.length,
    lastItemId,
    scroller,
  ]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
  );

  const handleDragBegin = useCallback(
    (activeId: string) => {
      editableConfig?.onItemSelected(null);

      if (!groupIds.has(activeId)) {
        clearGroup();
      }
    },
    [
      editableConfig,
      groupIds,
      clearGroup,
    ],
  );

  const commitOrder = useCallback(
    (order: TimelineItem[]) => {
      editableConfig?.setItems(order);
    },
    [
      editableConfig,
    ],
  );

  const latestRef = useRef({
    editableConfig,
    clearGroup,
    handleModifierClick,
  });
  latestRef.current = {
    editableConfig,
    clearGroup,
    handleModifierClick,
  };

  const itemActions = useMemo<TimelineItemActions>(
    () => ({
      onSelect(itemId, event) {
        const latest = latestRef.current;
        const config = latest.editableConfig;

        if (event?.ctrlKey || event?.metaKey || event?.shiftKey) {
          config?.onItemSelected(null);
          latest.handleModifierClick(itemId, !!event.shiftKey);
          return;
        }

        latest.clearGroup();
        config?.onItemSelected(
          config.selectedItemId === itemId ? null : itemId,
        );
      },
      onOpenChange(open) {
        if (!open) {
          latestRef.current.editableConfig?.onItemSelected(null);
        }
      },
      setItems(action) {
        latestRef.current.editableConfig?.setItems(action);
      },
      onWantsToRemove(itemId) {
        latestRef.current.editableConfig?.onWantsToRemove(itemId);
      },
      onWantsToUpdate(itemId, data) {
        latestRef.current.editableConfig?.onWantsToUpdate(itemId, data);
      },
      onWantsToInsertAfter(itemId, kind) {
        latestRef.current.editableConfig?.onWantsToInsertAfter(itemId, kind);
      },
      onTriggerKeyDown(event) {
        latestRef.current.editableConfig?.onTriggerKeyDown?.(event);
      },
      onFocusTriggerFieldConsumed() {
        latestRef.current.editableConfig?.onFocusTriggerFieldConsumed();
      },
      onFocusTextFieldConsumed() {
        latestRef.current.editableConfig?.onFocusTextFieldConsumed();
      },
    }),
    [],
  );

  const {
    displayItems,
    blockSide,
    drag,
    overlayRef,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  } = useTimelineDrag({
    items,
    groupIds,
    onCommit: commitOrder,
    onDragBegin: handleDragBegin,
    rowRef,
    zoomRef,
  });

  function duplicateSelection() {
    if (!editableConfig) {
      return;
    }

    const result = duplicateGroup(items, groupIds);
    editableConfig.setItems(result.items);
    setGroup(result.copyIds);
  }

  function moveSelectionToEdge(edge: "start" | "end") {
    editableConfig?.setItems((current) =>
      moveGroupToEdge(current, groupIds, edge),
    );
  }

  function removeSelection() {
    if (!editableConfig) {
      return;
    }

    const { setItems, onUndo } = editableConfig;

    setItems(removeGroup(items, groupIds));
    clearGroup();

    toast(
      t("tools.timeline.selection.removed", {
        count: groupIds.size,
      }),
      {
        action: {
          label: t("tools.timeline.selection.undo"),
          onClick: onUndo,
        },
      },
    );
  }

  function selectAll() {
    editableConfig?.onItemSelected(null);
    setGroup(itemIds);
  }

  function writeSelectionToClipboard(event: ClipboardEvent) {
    const selected = items.filter((item) => groupIds.has(item.id));

    event.clipboardData?.setData(
      TIMELINE_CLIPBOARD_TYPE,
      JSON.stringify(serializeTimelineItems(selected)),
    );

    // Also readable by Import Text Timeline and anything else.
    event.clipboardData?.setData(
      "text/plain",
      serializeTimelineToText(selected),
    );

    event.preventDefault();
  }

  const isDragging = !!drag && !drag.dropping;

  useEffect(() => {
    if (!editableConfig) {
      return;
    }

    const config = editableConfig;

    function isEditing(target: EventTarget | null) {
      return (
        target instanceof Element &&
        !!target.closest(
          "input, textarea, select, [contenteditable], [role=dialog], [role=menu]",
        )
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isDragging) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      const key = event.key.toLowerCase();

      if (target?.closest("[role=dialog], [role=menu]")) {
        return;
      }

      if (key === "escape" && groupIds.size > 0) {
        clearGroup();
        return;
      }

      if (isEditing(target)) {
        return;
      }

      const modifier = event.ctrlKey || event.metaKey;

      if (modifier && key === "z") {
        if (event.shiftKey) {
          config.onRedo();
        } else {
          config.onUndo();
        }
      } else if (modifier && key === "y") {
        config.onRedo();
      } else if (groupIds.size === 0) {
        return;
      } else if (key === "delete" || key === "backspace") {
        removeSelection();
      } else if (modifier && key === "d") {
        duplicateSelection();
      } else if (modifier && key === "a") {
        selectAll();
      } else if (event.altKey && key === "arrowleft") {
        config.setItems((current) => nudgeGroup(current, groupIds, -1));
      } else if (event.altKey && key === "arrowright") {
        config.setItems((current) => nudgeGroup(current, groupIds, 1));
      } else {
        return;
      }

      event.preventDefault();
    }

    function onCopy(event: ClipboardEvent) {
      if (isDragging || groupIds.size === 0 || isEditing(event.target)) {
        return;
      }

      writeSelectionToClipboard(event);
      toast(
        t("tools.timeline.selection.copied", {
          count: groupIds.size,
        }),
      );
    }

    function onCut(event: ClipboardEvent) {
      if (isDragging || groupIds.size === 0 || isEditing(event.target)) {
        return;
      }

      writeSelectionToClipboard(event);
      removeSelection();
    }

    function onPaste(event: ClipboardEvent) {
      if (isDragging || isEditing(event.target)) {
        return;
      }

      const raw = event.clipboardData?.getData(TIMELINE_CLIPBOARD_TYPE);
      if (!raw) {
        return;
      }

      event.preventDefault();

      try {
        const pasted = deserializeTimelineItems(JSON.parse(raw), allStudents);
        config.onItemSelected(null);
        config.setItems((current) => [
          ...current,
          ...pasted,
        ]);
        setGroup(pasted.map((item) => item.id));
      } catch (error) {
        console.error(error);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);

    return () => {
      window.removeEventListener("keydown", onKeyDown);

      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
    };
  });

  const handleItemClicked = useCallback(
    (item: TimelineItem) => {
      return () => {
        onItemClicked?.(item);
      };
    },
    [
      onItemClicked,
    ],
  );

  const handleItemKeyUp = useCallback(
    (item: TimelineItem) => {
      return (event: React.KeyboardEvent) => {
        if (event.key === "Enter") {
          onItemClicked?.(item);
        }
      };
    },
    [
      onItemClicked,
    ],
  );

  if (items.length === 0) {
    return (
      <div className="border rounded-md px-4 py-10 text-center text-xl text-muted-foreground">
        {t("tools.timeline.empty")}
      </div>
    );
  }

  const draggedIds = drag && !drag.dropping ? drag.groupIds : null;
  const heldBreaks =
    drag && draggedIds
      ? placeHeldRowBreaks(
          displayItems,
          draggedIds,
          drag.heldBreaks,
          blockSide,
          verticalSeparatorSize,
        )
      : null;

  const itemElements = displayItems.map((item, idx) => {
    const previousItem = displayItems[idx - 1];

    const marginLeft = getItemMarginLeft(
      item,
      previousItem && heldBreaks?.has(previousItem.id)
        ? undefined
        : previousItem,
      itemSpacing,
    );

    if (editableConfig) {
      const isOpen = editableConfig.selectedItemId === item.id;

      return (
        <EditableTimelineItem
          key={item.id}
          item={item}
          marginLeft={marginLeft}
          isOpen={isOpen}
          isInGroup={groupIds.has(item.id) && !busy}
          isDragged={!!draggedIds?.has(item.id)}
          heldBreakHeight={heldBreaks?.get(item.id)}
          busy={busy}
          horizontalSeparatorSize={horizontalSeparatorSize}
          verticalSeparatorSize={verticalSeparatorSize}
          uniqueStudents={isOpen ? editableConfig.uniqueStudents : NO_STUDENTS}
          autoFocusTrigger={editableConfig.focusTriggerFieldItemId === item.id}
          autoFocusText={editableConfig.focusTextFieldItemId === item.id}
          actions={itemActions}
        />
      );
    }

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: read-only preview items are clicked with the pointer; Enter is handled for parents that make them focusable
      <div
        key={item.id}
        className={cn("shrink-0", getItemClassName(item))}
        style={getItemStyle(
          item,
          marginLeft,
          horizontalSeparatorSize,
          verticalSeparatorSize,
          false,
        )}
        onClick={handleItemClicked(item)}
        onKeyUp={handleItemKeyUp(item)}
      >
        <TimelineItemContent
          item={item}
          busy={busy}
          editable={false}
          horizontalSeparatorSize={horizontalSeparatorSize}
        />
      </div>
    );
  });

  const previewContent = (
    <div
      className={cn("relative", editableConfig && "select-none")}
      onPointerDown={editableConfig ? handleContainerPointerDown : undefined}
      onContextMenuCapture={
        editableConfig
          ? (event) => {
              const target = event.target as Element;
              if (!event.currentTarget.contains(target)) {
                return;
              }

              editableConfig.onItemSelected(null);

              const anchor = target.closest<HTMLElement>(
                "[data-timeline-preview-anchor]",
              );

              const itemId = anchor?.dataset.timelinePreviewAnchor;
              if (itemId && !groupIds.has(itemId)) {
                setGroup([
                  itemId,
                ]);
              }
            }
          : undefined
      }
    >
      <div
        ref={setScroller}
        className="flex flex-col gap-4 items-start justify-center max-md:overflow-x-auto"
      >
        <div ref={zoomRef} className={cn(!busy && PREVIEW_ZOOM_CLASS)}>
          <div
            className="flex items-center gap-3 px-4 py-18"
            ref={containerRef}
          >
            <div className="flex flex-col gap-1">
              {busy && exportHeader && (
                <div className="mb-8 self-start">{exportHeader}</div>
              )}

              <div
                ref={rowRef}
                className="relative flex flex-wrap items-start max-md:block max-md:w-max max-md:whitespace-nowrap"
              >
                {heldBreaks?.has(null) && (
                  <TimelineRowBreak height={heldBreaks.get(null) ?? 0} />
                )}
                {itemElements}
              </div>
            </div>
          </div>
        </div>
      </div>

      {overflow.left && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-background to-transparent" />
      )}
      {overflow.right && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-background to-transparent" />
      )}

      {drag && (
        <TimelineDragOverlay
          key={drag.key}
          drag={drag}
          items={items}
          overlayRef={overlayRef}
          horizontalSeparatorSize={horizontalSeparatorSize}
        />
      )}

      {marquee && (
        <div
          className="pointer-events-none fixed z-50 rounded-sm border border-primary bg-primary/15"
          style={marquee}
        />
      )}
    </div>
  );

  if (editableConfig) {
    return (
      <DndContext
        sensors={sensors}
        measuring={DND_MEASURING}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        onDragStart={handleDragStart}
      >
        <ContextMenu>
          <ContextMenuTrigger asChild disabled={isCoarsePointer}>
            {previewContent}
          </ContextMenuTrigger>

          <ContextMenuContent className="w-52">
            {groupIds.size > 0 && (
              <>
                <ContextMenuLabel className="text-xs font-normal text-muted-foreground">
                  {t("tools.timeline.selection.count", {
                    count: groupIds.size,
                  })}
                </ContextMenuLabel>

                <ContextMenuItem onSelect={duplicateSelection}>
                  <CopyPlusIcon />
                  {t("tools.timeline.selection.duplicate")}
                  <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
                </ContextMenuItem>

                <ContextMenuItem onSelect={() => moveSelectionToEdge("start")}>
                  <ArrowLeftToLineIcon />
                  {t("tools.timeline.selection.moveToStart")}
                </ContextMenuItem>

                <ContextMenuItem onSelect={() => moveSelectionToEdge("end")}>
                  <ArrowRightToLineIcon />
                  {t("tools.timeline.selection.moveToEnd")}
                </ContextMenuItem>

                <ContextMenuItem
                  variant="destructive"
                  className="dark:data-[variant=destructive]:text-red-400"
                  onSelect={removeSelection}
                >
                  <Trash2Icon />
                  {t("tools.timeline.selection.remove")}
                  <ContextMenuShortcut>Del</ContextMenuShortcut>
                </ContextMenuItem>

                <ContextMenuSeparator />
              </>
            )}

            <ContextMenuItem onSelect={selectAll}>
              {t("tools.timeline.selection.selectAll")}
              <ContextMenuShortcut>Ctrl+A</ContextMenuShortcut>
            </ContextMenuItem>

            {groupIds.size > 0 && (
              <ContextMenuItem onSelect={clearGroup}>
                {t("tools.timeline.selection.clear")}
                <ContextMenuShortcut>Esc</ContextMenuShortcut>
              </ContextMenuItem>
            )}
          </ContextMenuContent>
        </ContextMenu>
      </DndContext>
    );
  }

  return previewContent;
}
