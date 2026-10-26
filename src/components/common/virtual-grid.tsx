"use client";

import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { WindowVirtualizer } from "virtua";

type VirtualGridProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Narrowest a column may get, in pixels, like `minmax(7rem, 1fr)`. */
  minItemWidth?: number;
  /** Space between columns and rows, in pixels. */
  gap?: number;
};

/**
 * A responsive card grid that only mounts the rows near the viewport. The page
 * itself scrolls, so rows are virtualized against the window.
 */
export function VirtualGrid<T>({
  items,
  getKey,
  renderItem,
  minItemWidth = 112,
  gap = 12,
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new ResizeObserver(() => setWidth(container.clientWidth));
    observer.observe(container);
    setWidth(container.clientWidth);

    return () => observer.disconnect();
  }, []);

  const columns = Math.max(1, Math.floor((width + gap) / (minItemWidth + gap)));

  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += columns) {
    rows.push(items.slice(index, index + columns));
  }

  return (
    <div ref={containerRef} className="w-full">
      {width > 0 && (
        <WindowVirtualizer>
          {rows.map((row, rowIndex) => (
            <div
              key={row.map(getKey).join("-")}
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap,
                // Spacing between rows lives inside each row so virtua measures
                // it.
                paddingBottom: rowIndex < rows.length - 1 ? gap : 0,
              }}
            >
              {row.map((item) => (
                <div key={getKey(item)}>{renderItem(item)}</div>
              ))}
            </div>
          ))}
        </WindowVirtualizer>
      )}
    </div>
  );
}
