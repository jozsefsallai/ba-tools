import type { ScreenshotState } from "@/app/[locale]/inventory-scanner/_lib/entries";
import type { Rect } from "@/lib/inventory-scan/types";
import { cn } from "@/lib/utils";

/** The part of a screenshot that shows an item. */
export function ScanCrop({
  screenshot,
  rect,
  width,
  className,
}: {
  screenshot: ScreenshotState;
  rect: Rect;
  width: number;
  className?: string;
}) {
  if (!screenshot.result) {
    return null;
  }

  const scale = width / rect.width;

  return (
    <span
      aria-hidden
      className={cn("block shrink-0 rounded-md", className)}
      style={{
        width,
        height: rect.height * scale,
        backgroundImage: `url(${screenshot.url})`,
        backgroundSize: `${screenshot.result.width * scale}px ${screenshot.result.height * scale}px`,
        backgroundPosition: `${-rect.x * scale}px ${-rect.y * scale}px`,
      }}
    />
  );
}
