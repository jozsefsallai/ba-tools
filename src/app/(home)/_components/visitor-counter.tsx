"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type VisitorCounterProps = {
  targetCount: number;
};

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function rollStart(target: number): number {
  return Math.max(0, target - Math.min(400, 120 + (target % 180)));
}

export function VisitorCounter({ targetCount }: VisitorCounterProps) {
  const t = useTranslations();
  const [display, setDisplay] = useState(() => rollStart(targetCount));

  useEffect(() => {
    const start = rollStart(targetCount);
    const end = targetCount;
    setDisplay(start);

    if (start >= end) {
      setDisplay(end);
      return;
    }

    const durationMs = 1400;
    const t0 = performance.now();
    let raf = 0;

    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / durationMs);
      const eased = easeOutCubic(u);
      setDisplay(Math.floor(start + (end - start) * eased));
      if (u < 1) {
        raf = requestAnimationFrame(step);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [targetCount]);

  const padded = String(display).padStart(8, "0");

  return (
    <p
      className="text-center comic-sans text-sm md:text-base font-bold tabular-nums"
      style={{ color: "#00aa00" }}
    >
      {t("static.home.visitorCounter", { count: padded })}
    </p>
  );
}
