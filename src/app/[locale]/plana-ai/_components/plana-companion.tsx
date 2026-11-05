"use client";

import { useEffect, useRef, useState } from "react";
import { Plana } from "@/components/plana";
import type { PlanaExpression } from "@/lib/plana-expressions";
import { cn } from "@/lib/utils";

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 850;

export function PlanaCompanion({
  expression,
  visible,
}: {
  expression: PlanaExpression;
  visible: boolean;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const { height, width } = entry.contentRect;

      if (width === 0 || height === 0) {
        return;
      }

      setScale(
        Math.min(
          Math.max(
            Math.min(
              width / (CANVAS_WIDTH * 0.8),
              height / (CANVAS_HEIGHT * 0.9),
            ),
            0.6,
          ),
          1.4,
        ),
      );
    });

    observer.observe(panel);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <aside
      aria-hidden
      className={cn(
        "relative hidden min-h-0 w-[300px] shrink-0 overflow-hidden border-l bg-gradient-to-b from-background to-muted/50 xl:w-[400px]",
        visible && "lg:block",
      )}
      ref={panelRef}
    >
      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        <div
          style={{
            transform: `translateY(8%) scale(${scale})`,
            transformOrigin: "bottom center",
          }}
        >
          <Plana expression={expression} inline />
        </div>
      </div>
    </aside>
  );
}
