"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { hexToRgba } from "@/lib/canvas";
import { cn } from "@/lib/utils";

export type ExportBackgroundControlsProps = {
  transparentBackground: boolean;
  backgroundColor: string;
  backgroundOpacity: number;
  onTransparentBackgroundChange: (value: boolean) => void;
  onBackgroundColorChange: (value: string) => void;
  onBackgroundOpacityChange: (value: number) => void;
  labels: {
    transparentBackground: string;
    backgroundColor: string;
    backgroundOpacity: string;
  };
  idPrefix?: string;
  className?: string;
};

export function ExportBackgroundControls({
  transparentBackground,
  backgroundColor,
  backgroundOpacity,
  onTransparentBackgroundChange,
  onBackgroundColorChange,
  onBackgroundOpacityChange,
  labels,
  idPrefix = "export-bg",
  className,
}: ExportBackgroundControlsProps) {
  const colorId = `${idPrefix}-color`;
  const opacityId = `${idPrefix}-opacity`;
  const transparentId = `${idPrefix}-transparent`;

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row flex-wrap gap-4 md:gap-6 items-center justify-center",
        className,
      )}
    >
      <div className="flex gap-2 items-center">
        <Switch
          id={transparentId}
          checked={transparentBackground}
          onCheckedChange={onTransparentBackgroundChange}
        />
        <Label htmlFor={transparentId}>{labels.transparentBackground}</Label>
      </div>

      <div
        className={cn("flex gap-2 items-center", {
          "opacity-50 pointer-events-none": transparentBackground,
        })}
      >
        <Label htmlFor={colorId} className="shrink-0">
          {labels.backgroundColor}
        </Label>
        <Input
          id={colorId}
          type="color"
          value={backgroundColor}
          disabled={transparentBackground}
          onChange={(e) => onBackgroundColorChange(e.target.value)}
          className="w-12 h-9 p-1 cursor-pointer"
        />
      </div>

      <div
        className={cn("flex gap-2 items-center min-w-48", {
          "opacity-50 pointer-events-none": transparentBackground,
        })}
      >
        <Label htmlFor={opacityId} className="shrink-0">
          {labels.backgroundOpacity}
        </Label>
        <Slider
          id={opacityId}
          min={0}
          max={100}
          step={1}
          value={[backgroundOpacity]}
          disabled={transparentBackground}
          onValueChange={([value]) => onBackgroundOpacityChange(value)}
          className="w-28"
        />
        <span className="text-sm text-muted-foreground w-10 tabular-nums">
          {backgroundOpacity}%
        </span>
      </div>

      <div
        className="size-8 shrink-0 rounded-md border border-border overflow-hidden relative"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #c4c4c4 25%, transparent 25%), linear-gradient(-45deg, #c4c4c4 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #c4c4c4 75%), linear-gradient(-45deg, transparent 75%, #c4c4c4 75%)",
          backgroundSize: "8px 8px",
          backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
          backgroundColor: "#ffffff",
        }}
        aria-hidden
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: transparentBackground
              ? "transparent"
              : hexToRgba(backgroundColor, backgroundOpacity),
          }}
        />
      </div>
    </div>
  );
}
