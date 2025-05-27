"use client";

import { useEffect, useRef } from "react";

import { Plana as PlanaInstance } from "@/lib/plana";
import { cn } from "@/lib/utils";

export function Plana({
  centered,
}: {
  centered?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const planaRef = useRef<PlanaInstance | null>(null);

  useEffect(() => {
    async function initPlana() {
      if (!canvasRef.current) {
        return;
      }

      planaRef.current = new PlanaInstance(canvasRef.current);
      await planaRef.current.init();
    }

    initPlana();
  }, [canvasRef]);

  useEffect(() => {
    return () => {
      if (planaRef.current) {
        planaRef.current.deinit();
      }
    };
  }, []);

  return (
    <div
      className={cn("fixed select-none bottom-0", {
        "-right-8": !centered,
        "left-1/2 transform -translate-x-1/2": centered,
      })}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
