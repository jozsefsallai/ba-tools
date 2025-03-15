"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TileProps = {
  value?: number;
  blocked?: boolean;
  onClick?: () => void;
  highlight?: boolean;
};

export function Tile({ value, blocked, onClick, highlight }: TileProps) {
  return (
    <Button
      onClick={onClick}
      variant="secondary"
      className={cn(
        "size-16 flex items-center justify-center hover:opacity-90",
        {
          "opacity-40 hover:opacity-30": blocked,
          "ring-2": highlight,
        },
      )}
      style={{
        backgroundColor: value ? `rgba(81, 162, 255, ${value})` : undefined,
      }}
    >
      {value && `${(value * 100).toFixed(1)}%`}
    </Button>
  );
}
