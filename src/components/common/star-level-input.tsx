"use client";

import blueStar from "@/assets/images/blue_star.png";
import yellowStar from "@/assets/images/yellow_star.png";

import type { StarLevel, UELevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

export type StarLevelInputValue = {
  starLevel?: StarLevel;
  ueLevel?: UELevel;
};

export type StarLevelInputProps = {
  value: StarLevelInputValue;
  onValueChanged: (value: StarLevelInputValue) => void;
  className?: string;
  imageClassName?: string;
  disabled?: boolean;
};

const TOTAL_YELLOW_STARS = 5;
const TOTAL_BLUE_STARS = 4;
const TOTAL_STARS = TOTAL_YELLOW_STARS + TOTAL_BLUE_STARS;

function getActiveIndex({ starLevel, ueLevel }: StarLevelInputValue) {
  if (ueLevel) {
    return TOTAL_YELLOW_STARS + ueLevel;
  }

  return starLevel ?? 0;
}

function getValueFromIndex(index: number): StarLevelInputValue {
  if (index <= 0) {
    return {};
  }

  if (index <= TOTAL_YELLOW_STARS) {
    return { starLevel: index as StarLevel };
  }

  return {
    starLevel: 5,
    ueLevel: (index - TOTAL_YELLOW_STARS) as UELevel,
  };
}

export function StarLevelInput({
  value,
  onValueChanged,
  className,
  imageClassName,
  disabled = false,
}: StarLevelInputProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const activeIndex = useMemo(() => getActiveIndex(value), [value]);
  const displayIndex = hoverIndex ?? activeIndex;

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      onPointerLeave={() => setHoverIndex(null)}
    >
      {Array.from({ length: TOTAL_STARS }, (_, i) => {
        const index = i + 1;
        const isBlue = index > TOTAL_YELLOW_STARS;
        const isSelected = index <= displayIndex;
        const isPressed = index === activeIndex;

        return (
          <button
            key={index}
            type="button"
            disabled={disabled}
            aria-pressed={isPressed}
            aria-label={
              isBlue ? `UE ${index - TOTAL_YELLOW_STARS}` : `${index} stars`
            }
            className={cn(
              "relative transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 rounded-sm disabled:cursor-not-allowed",
              isSelected ? "opacity-100" : "opacity-30",
            )}
            onPointerEnter={() => setHoverIndex(index)}
            onClick={() => {
              const nextValue =
                index === activeIndex ? {} : getValueFromIndex(index);
              onValueChanged(nextValue);
            }}
          >
            <img
              src={(isBlue ? blueStar : yellowStar).src}
              alt=""
              className={cn("size-7 select-none", imageClassName)}
            />
          </button>
        );
      })}
    </div>
  );
}
