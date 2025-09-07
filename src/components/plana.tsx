"use client";

import { useEffect, useRef } from "react";

import { type PlanaExpression, Plana as PlanaInstance } from "@/lib/plana";
import { cn } from "@/lib/utils";

export function Plana({
  centered,
  expression,
  inline = false,
}: {
  centered?: boolean;
  expression?: PlanaExpression;
  inline?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const planaRef = useRef<PlanaInstance | null>(null);

  useEffect(() => {
    async function initPlana() {
      if (!canvasRef.current) {
        return;
      }

      planaRef.current = new PlanaInstance(canvasRef.current, {
        expression,
      });
      await planaRef.current.init();
    }

    initPlana();
  }, [canvasRef]);

  useEffect(() => {
    if (!expression) {
      return;
    }

    if (planaRef.current) {
      planaRef.current.setExpression(expression);
    }
  }, [expression]);

  useEffect(() => {
    return () => {
      if (planaRef.current) {
        planaRef.current.deinit();
      }
    };
  }, []);

  return (
    <div
      className={cn("select-none z-20 bottom-0", {
        fixed: !inline,
        "-right-8": !centered,
        "left-1/2 transform -translate-x-1/2": centered,
      })}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
