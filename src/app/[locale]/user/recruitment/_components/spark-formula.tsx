"use client";

import "katex/dist/katex.min.css";
import katex from "katex";
import { useEffect, useRef } from "react";

type SparkFormulaProps = {
  /** The formula in LaTeX. */
  tex: string;
};

export function SparkFormula({ tex }: SparkFormulaProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      katex.render(tex, ref.current, {
        displayMode: true,
        throwOnError: false,
      });
    }
  }, [
    tex,
  ]);

  return (
    <div ref={ref} className="overflow-x-auto bg-muted px-3 py-1 text-sm" />
  );
}
