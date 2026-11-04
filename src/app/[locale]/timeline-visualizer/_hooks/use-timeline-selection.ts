"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

const MARQUEE_THRESHOLD_PX = 4;
const ANCHOR_SELECTOR = "[data-timeline-preview-anchor]";

export type MarqueeRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function rectsIntersect(a: MarqueeRect, b: DOMRect) {
  return (
    a.left < b.right &&
    a.left + a.width > b.left &&
    a.top < b.bottom &&
    a.top + a.height > b.top
  );
}

export function useTimelineSelection(itemIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);

  const rangeAnchorRef = useRef<string | null>(null);

  const groupIds = useMemo(() => {
    const existing = new Set(itemIds);
    return new Set(
      [
        ...selected,
      ].filter((id) => existing.has(id)),
    );
  }, [
    selected,
    itemIds,
  ]);

  const setGroup = useCallback((ids: Iterable<string>) => {
    setSelected(new Set(ids));
  }, []);

  const clearGroup = useCallback(() => {
    rangeAnchorRef.current = null;
    setSelected((prev) => (prev.size === 0 ? prev : new Set()));
  }, []);

  const handleModifierClick = useCallback(
    (itemId: string, range: boolean) => {
      const anchor = rangeAnchorRef.current;

      if (range && anchor && itemIds.includes(anchor)) {
        const from = itemIds.indexOf(anchor);
        const to = itemIds.indexOf(itemId);

        setSelected(
          new Set(itemIds.slice(Math.min(from, to), Math.max(from, to) + 1)),
        );

        return;
      }

      rangeAnchorRef.current = itemId;

      setSelected((prev) => {
        const next = new Set(prev);

        if (!next.delete(itemId)) {
          next.add(itemId);
        }

        return next;
      });
    },
    [
      itemIds,
    ],
  );

  const handleContainerPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const container = event.currentTarget;
      const target = event.target as Element;

      if (
        event.button !== 0 ||
        event.pointerType !== "mouse" ||
        !container.contains(target) ||
        target.closest(ANCHOR_SELECTOR)
      ) {
        return;
      }

      const startX = event.clientX;
      const startY = event.clientY;

      const additive = event.ctrlKey || event.metaKey || event.shiftKey;

      const base = additive ? new Set(groupIds) : new Set<string>();

      const anchors = Array.from(
        container.querySelectorAll<HTMLElement>(ANCHOR_SELECTOR),
      ).map((element) => ({
        id: element.dataset.timelinePreviewAnchor ?? "",
        rect: element.getBoundingClientRect(),
      }));

      let dragging = false;
      const previousUserSelect = document.body.style.userSelect;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const width = Math.abs(moveEvent.clientX - startX);
        const height = Math.abs(moveEvent.clientY - startY);

        if (!dragging && Math.max(width, height) < MARQUEE_THRESHOLD_PX) {
          return;
        }

        dragging = true;
        document.body.style.userSelect = "none";

        const rect = {
          left: Math.min(moveEvent.clientX, startX),
          top: Math.min(moveEvent.clientY, startY),
          width,
          height,
        };

        setMarquee(rect);
        setSelected(
          new Set([
            ...base,
            ...anchors
              .filter((anchor) => rectsIntersect(rect, anchor.rect))
              .map((anchor) => anchor.id),
          ]),
        );
      };

      const onPointerUp = () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);

        document.body.style.userSelect = previousUserSelect;

        setMarquee(null);

        if (!dragging && !additive) {
          clearGroup();
        }
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    },
    [
      groupIds,
      clearGroup,
    ],
  );

  return {
    groupIds,
    setGroup,
    clearGroup,
    handleModifierClick,
    handleContainerPointerDown,
    marquee,
  };
}
