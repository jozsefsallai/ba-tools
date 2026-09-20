"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

export type TileProps = {
  value?: number;
  blocked?: boolean;
  onClick?: () => void;
  onHover?: () => void;
  onUnhover?: () => void;
  highlight?: boolean;
  hovered?: boolean;
  isMultiSelect?: boolean;
};

export function Tile({
  value,
  blocked,
  onClick,
  onHover,
  onUnhover,
  highlight,
  hovered,
  isMultiSelect,
}: TileProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Button
      onClick={onClick}
      onMouseOver={onHover}
      onMouseLeave={onUnhover}
      variant={resolvedTheme === "dark" ? "secondary" : "default"}
      className={cn(
        "size-8 text-[10px] md:size-16 md:text-base flex items-center justify-center hover:opacity-90",
        {
          "ring-2": highlight,
          "ring-black": resolvedTheme === "light" && highlight,
          "bg-secondary/80 opacity-90": resolvedTheme === "dark" && hovered,
          "ring-2 ring-yellow-500 dark:ring-yellow-400":
            hovered && isMultiSelect,
          "opacity-40 hover:opacity-30": blocked,
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
