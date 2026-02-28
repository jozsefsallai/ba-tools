"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type FlippableCardProps = {
  isFlipped: boolean;
  front: ReactNode;
  back: ReactNode;
  className?: string;
};

export function FlippableCard({
  isFlipped,
  front,
  back,
  className,
}: FlippableCardProps) {
  return (
    <div
      className={cn("perspective-midrange", className)}
      style={{ perspective: "1000px" }}
    >
      <div
        className={cn(
          "relative w-full h-full transition-transform duration-700 ease-in-out",
          "[transform-style:preserve-3d]",
          isFlipped && "[transform:rotateY(180deg)]",
        )}
      >
        <div className="relative inset-0 w-full h-full [backface-visibility:hidden]">
          {front}
        </div>

        <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {back}
        </div>
      </div>
    </div>
  );
}
