"use client";

import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { TimelineItem } from "@/app/[locale]/timeline-visualizer/_components/timeline-preview";
import {
  type BlockSide,
  type DragSlot,
  findStepDropTarget,
  gatherGroup,
  getHeldRowBreaks,
  type HeldRowBreak,
  haveSameOrder,
  placeGroup,
} from "@/lib/timeline-selection";

const ANCHOR_SELECTOR = "[data-timeline-preview-anchor]";
const FLIP_ID = "timeline-reflow";
const FLIP_DURATION_MS = 180;
const FLIP_EASING = "cubic-bezier(0.2, 0, 0, 1)";
const DROP_DURATION_MS = 180;

const REVERT_PX = 12;
const CATCH_UP_STEP_MS = 16;

export type ActiveDrag = {
  key: number;
  dropping: boolean;
  activeId: string;
  groupIds: Set<string>;
  heldBreaks: HeldRowBreak[];
  grabOffset: {
    x: number;
    y: number;
  };
};

function getAnchors(row: HTMLElement) {
  return Array.from(row.querySelectorAll<HTMLElement>(ANCHOR_SELECTOR));
}

function getAnchorId(anchor: HTMLElement) {
  return anchor.dataset.timelinePreviewAnchor ?? "";
}

export type UseTimelineDragOptions = {
  items: TimelineItem[];
  groupIds: Set<string>;
  onCommit: (items: TimelineItem[]) => void;
  onDragBegin: (activeId: string) => void;
  rowRef: RefObject<HTMLElement | null>;
  zoomRef: RefObject<HTMLElement | null>;
};

export function useTimelineDrag({
  items,
  groupIds,
  onCommit,
  onDragBegin,
  rowRef,
  zoomRef,
}: UseTimelineDragOptions) {
  const [drag, setDrag] = useState<ActiveDrag | null>(null);
  const [dragOrder, setDragOrder] = useState<TimelineItem[] | null>(null);
  const [blockSide, setBlockSide] = useState<BlockSide>("beforeBreak");

  const overlayRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({
    x: 0,
    y: 0,
  });
  const orderRef = useRef<TimelineItem[] | null>(null);
  const blockSideRef = useRef<BlockSide>("beforeBreak");
  const dropAnimationRef = useRef<Animation | null>(null);
  const awaitingLayoutRef = useRef(false);
  const updateRef = useRef<(() => void) | null>(null);
  const dropTimerRef = useRef<number | undefined>(undefined);
  const lastReorderRef = useRef<{
    pointer: {
      x: number;
      y: number;
    };
    previousOrder: TimelineItem[];
    previousSide: BlockSide;
  } | null>(null);
  const flipFromRef = useRef<Map<string, DOMRect> | null>(null);
  const slotsRef = useRef<Map<string, Omit<DragSlot, "isRowBreak">>>(new Map());

  const displayItems = dragOrder ?? items;
  const orderKey = `${displayItems.map((item) => item.id).join()}:${blockSide}`;

  const applyOrder = useCallback(
    (next: TimelineItem[] | null, side: BlockSide = "beforeBreak") => {
      const row = rowRef.current;
      if (row) {
        flipFromRef.current = new Map(
          getAnchors(row).map((anchor) => [
            getAnchorId(anchor),
            anchor.getBoundingClientRect(),
          ]),
        );
      }

      orderRef.current = next;
      blockSideRef.current = side;
      awaitingLayoutRef.current = true;
      setDragOrder(next);
      setBlockSide(side);
    },
    [
      rowRef,
    ],
  );

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) {
      return;
    }

    const anchors = getAnchors(row);
    const from = flipFromRef.current;
    flipFromRef.current = null;

    if (from) {
      for (const anchor of anchors) {
        for (const animation of anchor.getAnimations()) {
          if (animation.id === FLIP_ID) {
            animation.cancel();
          }
        }
      }
    }

    const rowRect = row.getBoundingClientRect();
    const rects = anchors.map((anchor) => ({
      anchor,
      rect: anchor.getBoundingClientRect(),
    }));

    slotsRef.current = new Map(
      rects.map(({ anchor, rect }) => [
        getAnchorId(anchor),
        {
          id: getAnchorId(anchor),
          left: rect.left - rowRect.left,
          top: rect.top - rowRect.top,
          right: rect.right - rowRect.left,
          bottom: rect.bottom - rowRect.top,
        },
      ]),
    );

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (awaitingLayoutRef.current) {
      awaitingLayoutRef.current = false;
      window.setTimeout(() => updateRef.current?.(), CATCH_UP_STEP_MS);
    }

    if (drag?.dropping) {
      const overlay = overlayRef.current;
      const landing = rects.find(
        ({ anchor }) => getAnchorId(anchor) === drag.activeId,
      )?.rect;

      if (!overlay || !landing || reducedMotion) {
        setDrag(null);
      } else {
        const options = {
          duration: DROP_DURATION_MS,
          easing: FLIP_EASING,
          fill: "forwards",
        } as const;

        const animation = overlay.animate(
          [
            {
              transform: overlay.style.transform,
            },
            {
              transform: `translate(${landing.left}px, ${landing.top}px)`,
            },
          ],
          options,
        );

        dropAnimationRef.current = animation;

        dropTimerRef.current = window.setTimeout(
          () => setDrag(null),
          DROP_DURATION_MS,
        );

        overlay.querySelector("[data-drag-lift]")?.animate(
          [
            {
              transform: "scale(1)",
            },
          ],
          options,
        );

        for (const card of overlay.querySelectorAll("[data-drag-pile-card]")) {
          card.animate(
            [
              {
                transform: "translate(0, 0)",
                opacity: 0,
              },
            ],
            options,
          );
        }
      }
    }

    if (!from || reducedMotion) {
      return;
    }

    const zoom = zoomRef.current
      ? Number.parseFloat(getComputedStyle(zoomRef.current).zoom) || 1
      : 1;

    for (const { anchor, rect } of rects) {
      const previous = from.get(getAnchorId(anchor));
      if (!previous) {
        continue;
      }

      const dx = (previous.left - rect.left) / zoom;
      const dy = (previous.top - rect.top) / zoom;

      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        continue;
      }

      anchor.animate(
        [
          {
            transform: `translate(${dx}px, ${dy}px)`,
          },
          {
            transform: "none",
          },
        ],
        {
          id: FLIP_ID,
          duration: FLIP_DURATION_MS,
          easing: FLIP_EASING,
        },
      );
    }
  }, [
    orderKey,
    drag?.activeId,
    drag?.dropping,
    rowRef,
    zoomRef,
  ]);

  const positionOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    const grab = drag?.grabOffset;
    if (overlay && grab) {
      const { x, y } = pointerRef.current;
      overlay.style.transform = `translate(${x - grab.x}px, ${y - grab.y}px)`;
    }
  }, [
    drag?.grabOffset,
  ]);

  useLayoutEffect(() => {
    positionOverlay();
  }, [
    positionOverlay,
  ]);

  useEffect(() => {
    if (!drag || drag.dropping) {
      return;
    }

    const { groupIds: draggedIds } = drag;
    const hasHeldBreaks = drag.heldBreaks.length > 0;

    const update = () => {
      positionOverlay();

      const row = rowRef.current;
      const order = orderRef.current;
      if (!row || !order || awaitingLayoutRef.current) {
        return;
      }

      const rowRect = row.getBoundingClientRect();
      const slots: DragSlot[] = [];

      for (const item of order) {
        const slot = slotsRef.current.get(item.id);
        if (slot) {
          slots.push({
            ...slot,
            isRowBreak:
              item.type === "separator" && item.orientation === "vertical",
          });
        }
      }

      const lead = slotsRef.current.get(drag.activeId);
      if (!lead) {
        return;
      }

      const target = findStepDropTarget(
        {
          x:
            pointerRef.current.x -
            rowRect.left -
            drag.grabOffset.x +
            (lead.right - lead.left) / 2,
          y:
            pointerRef.current.y -
            rowRect.top -
            drag.grabOffset.y +
            (lead.bottom - lead.top) / 2,
        },
        slots,
        draggedIds,
        drag.activeId,
      );

      if (!target) {
        return;
      }

      const next = placeGroup(order, draggedIds, target);

      const side: BlockSide =
        hasHeldBreaks && target.side === "before"
          ? "afterBreak"
          : "beforeBreak";

      if (haveSameOrder(order, next) && side === blockSideRef.current) {
        return;
      }

      const pointer = pointerRef.current;
      const last = lastReorderRef.current;
      const isRevert =
        !!last &&
        last.previousSide === side &&
        haveSameOrder(last.previousOrder, next);

      if (
        isRevert &&
        Math.hypot(pointer.x - last.pointer.x, pointer.y - last.pointer.y) <
          REVERT_PX
      ) {
        return;
      }

      lastReorderRef.current = {
        pointer,
        previousOrder: order,
        previousSide: blockSideRef.current,
      };
      applyOrder(next, side);
    };

    updateRef.current = update;

    const onMouseMove = (event: MouseEvent) => {
      pointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
      update();
    };

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) {
        pointerRef.current = {
          x: touch.clientX,
          y: touch.clientY,
        };
        update();
      }
    };

    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = "grabbing";

    window.addEventListener("mousemove", onMouseMove);

    window.addEventListener("touchmove", onTouchMove, {
      passive: true,
    });

    window.addEventListener("scroll", update, {
      capture: true,
      passive: true,
    });

    return () => {
      updateRef.current = null;

      document.body.style.cursor = previousCursor;

      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("scroll", update, {
        capture: true,
      });
    };
  }, [
    drag,
    rowRef,
    applyOrder,
    positionOverlay,
  ]);

  const handleDragStart = useCallback(
    ({ active, activatorEvent }: DragStartEvent) => {
      const activeId = active.id as string;
      onDragBegin(activeId);

      window.clearTimeout(dropTimerRef.current);
      dropAnimationRef.current?.cancel();
      dropAnimationRef.current = null;

      const draggedIds =
        groupIds.has(activeId) && groupIds.size > 1
          ? new Set(groupIds)
          : new Set([
              activeId,
            ]);

      const pointer = getEventCoordinates(activatorEvent) ?? {
        x: 0,
        y: 0,
      };
      pointerRef.current = pointer;
      lastReorderRef.current = null;

      const anchor = rowRef.current?.querySelector(
        `[data-timeline-preview-anchor="${activeId}"]`,
      );
      const rect = anchor?.getBoundingClientRect();

      setDrag({
        key: Date.now(),
        dropping: false,
        activeId,
        groupIds: draggedIds,
        heldBreaks: getHeldRowBreaks(items, draggedIds),
        grabOffset: {
          x: rect ? pointer.x - rect.left : 0,
          y: rect ? pointer.y - rect.top : 0,
        },
      });
      applyOrder(gatherGroup(items, draggedIds, activeId));
    },
    [
      groupIds,
      items,
      onDragBegin,
      rowRef,
      applyOrder,
    ],
  );

  const handleDragEnd = useCallback(
    (_event: DragEndEvent) => {
      const order = orderRef.current;
      const row = rowRef.current;

      if (row) {
        flipFromRef.current = new Map(
          getAnchors(row).map((anchor) => [
            getAnchorId(anchor),
            anchor.getBoundingClientRect(),
          ]),
        );
      }

      orderRef.current = null;
      setDrag((current) =>
        current
          ? {
              ...current,
              dropping: true,
            }
          : current,
      );
      setDragOrder(null);

      if (order && !haveSameOrder(order, items)) {
        onCommit(order);
      }
    },
    [
      items,
      onCommit,
      rowRef,
    ],
  );

  const handleDragCancel = useCallback(() => {
    setDrag((current) =>
      current
        ? {
            ...current,
            dropping: true,
          }
        : current,
    );
    applyOrder(null);
  }, [
    applyOrder,
  ]);

  return {
    displayItems,
    blockSide,
    drag,
    overlayRef,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  };
}
