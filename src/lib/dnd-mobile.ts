import type { Transform } from "@dnd-kit/utilities";
import {
  type MouseEvent,
  type RefObject,
  createContext,
  useContext,
} from "react";

export const TOUCH_DRAG_CLASS =
  "pointer-coarse:select-none pointer-coarse:[-webkit-touch-callout:none] pointer-coarse:[&_img]:pointer-events-none";

export function preventTouchContextMenu(event: MouseEvent) {
  if ((event.nativeEvent as PointerEvent).pointerType === "touch") {
    event.preventDefault();
  }
}

export const DndZoomContext =
  createContext<RefObject<HTMLElement | null> | null>(null);

export function useZoomCorrectedTransform(transform: Transform | null) {
  const zoomRef = useContext(DndZoomContext);

  if (!transform || !zoomRef?.current) {
    return transform;
  }

  const zoom = Number.parseFloat(getComputedStyle(zoomRef.current).zoom) || 1;

  if (zoom === 1) {
    return transform;
  }

  return { ...transform, x: transform.x / zoom, y: transform.y / zoom };
}
