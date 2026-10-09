"use client";

import type { PVPFormationStudentItem } from "@/app/[locale]/pvp/_lib/types";
import { cn } from "@/lib/utils";
import {
  DndContext,
  KeyboardCode,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";
import {
  type FocusEvent,
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";

type PVPFormationEditorStripProps = {
  formation: PVPFormationStudentItem[];
  onMove(from: number, to: number): void;
  onClear(index: number): void;
  renderItem(
    item: PVPFormationStudentItem,
    index: number,
    id: string,
    triggerId: string,
  ): ReactNode;
};

export function PVPFormationEditorStrip({
  formation,
  onMove,
  onClear,
  renderItem,
}: PVPFormationEditorStripProps) {
  const t = useTranslations();

  const editorId = useId();

  const emptyIds = useRef(new WeakMap<PVPFormationStudentItem, string>());
  const nextEmptyId = useRef(0);
  const dropAllowed = useRef(true);
  const tabEntry = useRef<"forward" | "backward" | null>(null);

  useEffect(() => {
    function trackKey(event: globalThis.KeyboardEvent) {
      tabEntry.current =
        event.key === "Tab" ? (event.shiftKey ? "backward" : "forward") : null;
    }

    function trackPointer() {
      tabEntry.current = null;
    }

    document.addEventListener("keydown", trackKey, true);
    document.addEventListener("pointerdown", trackPointer, true);

    return () => {
      document.removeEventListener("keydown", trackKey, true);
      document.removeEventListener("pointerdown", trackPointer, true);
    };
  }, []);

  function focusableElements(scope: HTMLElement) {
    return Array.from(
      scope.querySelectorAll<HTMLElement>(
        "button, input, select, textarea, a[href], [tabindex]",
      ),
    ).filter(
      (element) =>
        element.tabIndex >= 0 &&
        !element.matches(":disabled, [data-radix-focus-guard]") &&
        !element.closest("[inert]") &&
        element.getClientRects().length > 0 &&
        getComputedStyle(element).visibility !== "hidden",
    );
  }

  function formationTabOrder(root: HTMLElement) {
    const controls = focusableElements(root);

    return [
      ...controls.filter((element) =>
        element.hasAttribute("data-pvp-formation-card"),
      ),
      ...controls.filter(
        (element) => !element.hasAttribute("data-pvp-formation-card"),
      ),
    ];
  }

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    const root = event.currentTarget;

    // Popover content is portaled, let its own focus scope manage navigation
    if (!root.contains(event.target)) {
      return;
    }

    const direction = tabEntry.current;
    tabEntry.current = null;

    if (direction && !root.contains(event.relatedTarget as Node | null)) {
      const order = formationTabOrder(root);
      const entry = direction === "forward" ? order[0] : order.at(-1);

      if (entry && entry !== event.target) {
        entry.focus();
        return;
      }
    }

    event.target.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const root = event.currentTarget;
    if (!root.contains(event.target as Node)) {
      return;
    }

    const target = event.target as HTMLElement;
    if (
      event.key === "Delete" &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      target.hasAttribute("data-pvp-formation-card") &&
      target.getAttribute("aria-pressed") !== "true"
    ) {
      event.preventDefault();

      const index = Number(target.dataset.pvpFormationIndex);

      onClear(index);
      requestAnimationFrame(() =>
        document.getElementById(`${editorId}-slot-${index}`)?.focus(),
      );

      return;
    }

    if (
      event.key !== "Tab" ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.defaultPrevented
    ) {
      return;
    }

    const order = formationTabOrder(root);
    const index = order.indexOf(target);

    if (index < 0) {
      return;
    }

    const next = order[index + (event.shiftKey ? -1 : 1)];
    if (next) {
      event.preventDefault();
      event.stopPropagation();
      next.focus();
      return;
    }

    // Leave the formation without revisiting cards that occur later in DOM
    // order
    const scope = root.closest<HTMLElement>('[role="dialog"]') ?? document.body;

    const outside = focusableElements(scope).filter(
      (element) =>
        !root.contains(element) &&
        !element.contains(root) &&
        Boolean(
          root.compareDocumentPosition(element) &
            (event.shiftKey
              ? Node.DOCUMENT_POSITION_PRECEDING
              : Node.DOCUMENT_POSITION_FOLLOWING),
        ),
    );

    const destination = event.shiftKey ? outside.at(-1) : outside[0];

    if (destination) {
      event.preventDefault();
      event.stopPropagation();
      destination.focus();
    }
  }

  const ids = formation.map((item) => {
    if (item.student) {
      return item.student.id;
    }

    let id = emptyIds.current.get(item);

    if (!id) {
      id = `empty-${nextEmptyId.current++}`;
      emptyIds.current.set(item, id);
    }

    return id;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),

    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: {
        start: [KeyboardCode.Space],
        end: [KeyboardCode.Space],
        cancel: [KeyboardCode.Esc],
      },
    }),
  );

  const itemId = (index: number) => ids[index];

  return (
    <div
      className="@container/formation -mx-2 min-w-0 overflow-x-auto px-2 pt-2 pb-2"
      onFocusCapture={handleFocus}
      onKeyDown={handleKeyDown}
    >
      <div className="flex w-max min-w-full flex-col items-center justify-center gap-3 @min-[600px]/formation:flex-row @min-[600px]/formation:items-start">
        {[
          { start: 0, end: 4 },
          { start: 4, end: 6 },
        ].map(({ start, end }) => (
          <DndContext
            key={start}
            sensors={sensors}
            accessibility={{
              screenReaderInstructions: {
                draggable: t("tools.pvp.formationEditorItem.dragInstructions"),
              },
            }}
            collisionDetection={(args) => {
              const pointer = args.pointerCoordinates;
              const rects = Array.from(args.droppableRects.values());
              dropAllowed.current =
                !pointer ||
                (rects.length > 0 &&
                  pointer.x >= Math.min(...rects.map((rect) => rect.left)) &&
                  pointer.x <= Math.max(...rects.map((rect) => rect.right)) &&
                  pointer.y >= Math.min(...rects.map((rect) => rect.top)) &&
                  pointer.y <= Math.max(...rects.map((rect) => rect.bottom)));

              // A null target resets the dragged card's transform, causing a flash
              // at its original slot. Keep a target even in gaps or outside the group;
              // validate the drop separately and reset the preview outside the group.
              return closestCenter(
                dropAllowed.current
                  ? args
                  : {
                      ...args,
                      droppableContainers: args.droppableContainers.filter(
                        (container) => container.id === args.active.id,
                      ),
                    },
              );
            }}
            onDragEnd={({ active, over }) => {
              const allowed = dropAllowed.current;
              dropAllowed.current = true;
              if (!allowed || !over || active.id === over.id) {
                return;
              }

              const from = formation.findIndex(
                (_, index) => itemId(index) === active.id,
              );

              const to = formation.findIndex(
                (_, index) => itemId(index) === over.id,
              );

              if (from < start || from >= end || to < start || to >= end) {
                return;
              }

              onMove(from, to);
            }}
          >
            <SortableContext
              items={formation
                .slice(start, end)
                .map((_, offset) => itemId(start + offset))}
              strategy={horizontalListSortingStrategy}
            >
              <div
                className={cn(
                  "flex items-start gap-1 rounded-xl border px-2 pt-3 pb-2",
                  start === 0
                    ? "border-type-red/35 bg-type-red/20"
                    : "border-type-blue/35 bg-type-blue/20",
                )}
              >
                {formation.slice(start, end).map((item, offset) => {
                  const index = start + offset;

                  return (
                    <Fragment key={itemId(index)}>
                      {renderItem(
                        item,
                        index,
                        itemId(index),
                        `${editorId}-slot-${index}`,
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        ))}
      </div>
    </div>
  );
}
