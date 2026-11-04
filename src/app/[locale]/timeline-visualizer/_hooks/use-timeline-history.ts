"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { TimelineItem } from "@/app/[locale]/timeline-visualizer/_components/timeline-preview";
import { haveSameOrder } from "@/lib/timeline-selection";

const MAX_ENTRIES = 100;
const COALESCE_MS = 600;

export function useTimelineHistory(
  items: TimelineItem[],
  setItems: Dispatch<SetStateAction<TimelineItem[]>>,
) {
  const past = useRef<TimelineItem[][]>([]);
  const future = useRef<TimelineItem[][]>([]);
  const last = useRef(items);
  const lastChangeAt = useRef(0);
  const skipNext = useRef(false);

  useEffect(() => {
    if (items === last.current) {
      return;
    }

    const previous = last.current;
    last.current = items;

    if (skipNext.current) {
      skipNext.current = false;
      return;
    }

    const now = Date.now();

    const isSameEdit =
      now - lastChangeAt.current < COALESCE_MS &&
      past.current.length > 0 &&
      haveSameOrder(previous, items);

    lastChangeAt.current = now;

    if (!isSameEdit) {
      past.current = [
        ...past.current.slice(-(MAX_ENTRIES - 1)),
        previous,
      ];
    }

    future.current = [];
  }, [
    items,
  ]);

  const undo = useCallback(() => {
    const previous = past.current.at(-1);
    if (!previous) {
      return;
    }

    past.current = past.current.slice(0, -1);
    future.current = [
      ...future.current,
      last.current,
    ];
    skipNext.current = true;
    lastChangeAt.current = 0;
    setItems(previous);
  }, [
    setItems,
  ]);

  const redo = useCallback(() => {
    const next = future.current.at(-1);
    if (!next) {
      return;
    }

    future.current = future.current.slice(0, -1);
    past.current = [
      ...past.current,
      last.current,
    ];
    skipNext.current = true;
    lastChangeAt.current = 0;
    setItems(next);
  }, [
    setItems,
  ]);

  const resetHistory = useCallback(() => {
    past.current = [];
    future.current = [];
    skipNext.current = true;
    lastChangeAt.current = 0;
  }, []);

  return {
    undo,
    redo,
    resetHistory,
  };
}
