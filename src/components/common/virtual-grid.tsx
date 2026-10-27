"use client";

import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import {
  type CacheSnapshot,
  WindowVirtualizer,
  type WindowVirtualizerHandle,
} from "virtua";

type VirtualGridProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Narrowest a column may get, in pixels, like `minmax(7rem, 1fr)`. */
  minItemWidth?: number;
  /** Space between columns and rows, in pixels. */
  gap?: number;
  /**
   * When set, the scroll position is remembered under this key and restored
   * when coming back to the page with the browser's back/forward buttons, or
   * after {@link requestVirtualGridRestore}.
   */
  restoreKey?: string;
};

type ScrollSnapshot = {
  scrollY: number;
  columns: number;
  rowCount: number;
  cache: CacheSnapshot;
};

type NavigationLike = { currentEntry: { key: string } | null }; // welp

function historyEntryKey() {
  const navigation = (window as { navigation?: NavigationLike }).navigation;
  return navigation?.currentEntry?.key ?? null;
}

const LATEST_ENTRY = "latest";

function snapshotStorageKey(restoreKey: string, entryKey: string) {
  return `virtual-grid:${restoreKey}:${entryKey}`;
}

function restoreRequestStorageKey(restoreKey: string) {
  return `virtual-grid:${restoreKey}:restore-next`;
}

export function requestVirtualGridRestore(restoreKey: string) {
  try {
    sessionStorage.setItem(restoreRequestStorageKey(restoreKey), "1");
  } catch {
    // ¯\_(ツ)_/¯
  }
}

function readStoredSnapshot(restoreKey: string, entryKey: string) {
  const raw = sessionStorage.getItem(snapshotStorageKey(restoreKey, entryKey));
  return raw ? (JSON.parse(raw) as ScrollSnapshot) : null;
}

function readSnapshot(restoreKey: string | undefined) {
  if (!restoreKey) {
    return { snapshot: null, requested: false };
  }

  try {
    const requestKey = restoreRequestStorageKey(restoreKey);
    const requested = sessionStorage.getItem(requestKey) !== null;
    sessionStorage.removeItem(requestKey);

    const entryKey = historyEntryKey();
    const snapshot =
      (entryKey && readStoredSnapshot(restoreKey, entryKey)) ||
      (requested ? readStoredSnapshot(restoreKey, LATEST_ENTRY) : null);

    return { snapshot, requested };
  } catch {
    return { snapshot: null, requested: false };
  }
}

function writeSnapshot(
  restoreKey: string,
  entryKey: string | null,
  snapshot: ScrollSnapshot,
) {
  try {
    const json = JSON.stringify(snapshot);

    if (entryKey) {
      sessionStorage.setItem(snapshotStorageKey(restoreKey, entryKey), json);
    }

    sessionStorage.setItem(snapshotStorageKey(restoreKey, LATEST_ENTRY), json);
  } catch {
    // ¯\_(ツ)_/¯
  }
}

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
  restoreKey,
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const virtualizerRef = useRef<WindowVirtualizerHandle>(null);

  const [width, setWidth] = useState(0);

  const [{ snapshot, requested }] = useState(() =>
    typeof window === "undefined"
      ? { snapshot: null, requested: false }
      : readSnapshot(restoreKey),
  );

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

  const restoredCache =
    snapshot &&
    snapshot.columns === columns &&
    snapshot.rowCount === rows.length
      ? snapshot.cache
      : undefined;

  const latest = useRef({ columns, rowCount: rows.length });
  latest.current = { columns, rowCount: rows.length };

  const ready = width > 0;

  useLayoutEffect(() => {
    if (!ready || !restoreKey) {
      return;
    }

    if (snapshot) {
      window.scrollTo({ top: snapshot.scrollY, behavior: "instant" });
    } else if (requested) {
      // The link that asked for a restore left scrolling to us.
      window.scrollTo({ top: 0, behavior: "instant" });
    }

    let scrollY = window.scrollY;

    let entryKey = historyEntryKey();

    const handleScroll = () => {
      scrollY = window.scrollY;
      entryKey = historyEntryKey();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);

      const cache = virtualizerRef.current?.cache;

      if (cache) {
        writeSnapshot(restoreKey, entryKey, {
          scrollY,
          cache,
          ...latest.current,
        });
      }
    };
  }, [ready, restoreKey, snapshot, requested]);

  return (
    <div ref={containerRef} className="w-full">
      {ready && (
        <WindowVirtualizer ref={virtualizerRef} cache={restoredCache}>
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
