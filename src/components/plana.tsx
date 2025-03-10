"use client";

import { useEffect, useRef, useState } from "react";

import { Plana as PlanaInstance } from "@/lib/plana";
import { Button } from "@/components/ui/button";

export function Plana() {
  const [visible, setVisible] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const planaRef = useRef<PlanaInstance | null>(null);

  useEffect(() => {
    async function initPlana() {
      if (!visible || !canvasRef.current) {
        return;
      }

      planaRef.current = new PlanaInstance(canvasRef.current);
      await planaRef.current.init();
    }

    initPlana();
  }, [visible, canvasRef]);

  useEffect(() => {
    return () => {
      if (planaRef.current) {
        planaRef.current.deinit();
      }
    };
  }, []);

  return (
    <>
      <div className="hidden md:block">
        <Button variant="outline" onClick={() => setVisible(!visible)}>
          {visible ? "Hide" : "Show"} Plana
        </Button>
      </div>

      <div className="hidden md:block fixed bottom-0 -right-8">
        {visible && <canvas ref={canvasRef} />}
      </div>
    </>
  );
}
