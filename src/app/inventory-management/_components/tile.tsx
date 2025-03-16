"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TileProps = {
  value?: number;
  blocked?: boolean;
  onClick?: () => void;
  onHover?: () => void;
  onUnhover?: () => void;
  highlight?: boolean;
  hovered?: boolean;
};

export function Tile({
  value,
  blocked,
  onClick,
  onHover,
  onUnhover,
  highlight,
  hovered,
}: TileProps) {
  return (
    <Button
      onClick={onClick}
      onMouseOver={onHover}
      onMouseLeave={onUnhover}
      variant="secondary"
      className={cn(
        "size-8 text-[10px] md:size-16 md:text-base flex items-center justify-center hover:opacity-90",
        {
          "opacity-40 hover:opacity-30": blocked,
          "ring-2": highlight,
          "bg-secondary/80 opacity-90": hovered,
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
