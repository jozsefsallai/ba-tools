"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ScreenshotState } from "@/app/[locale]/inventory-scanner/_lib/entries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Rect } from "@/lib/inventory-scan/types";
import { cn } from "@/lib/utils";

export type ViewedScreenshot = {
  id: string;
  /** The item to point out */
  rect?: Rect;
};

/** Shows a screenshot in full, and lets the user step through all of them. */
export function ScreenshotViewer({
  screenshots,
  viewed,
  onView,
}: {
  screenshots: ScreenshotState[];
  viewed: ViewedScreenshot | null;
  onView: (viewed: ViewedScreenshot | null) => void;
}) {
  const t = useTranslations();

  const [actualSize, setActualSize] = useState(false);

  const index = screenshots.findIndex(({ id }) => id === viewed?.id);
  const screenshot = screenshots[index];
  const size = screenshot?.result;
  const rect = viewed?.rect;

  function step(by: number) {
    const next = screenshots[index + by];

    if (next) {
      onView({
        id: next.id,
      });
    }
  }

  return (
    <Dialog
      open={screenshot !== undefined}
      onOpenChange={(open) => {
        if (!open) {
          onView(null);
          setActualSize(false);
        }
      }}
    >
      {screenshot && (
        <DialogContent
          className="flex w-fit max-w-[calc(100%-1rem)] flex-col gap-3 p-3 sm:max-w-[calc(100%-3rem)]"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              step(-1);
            } else if (event.key === "ArrowRight") {
              step(1);
            }
          }}
        >
          <div className="flex min-w-0 items-center gap-2 pr-8">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={index === 0}
              aria-label={t("tools.inventoryScanner.viewer.previous")}
              onClick={() => step(-1)}
            >
              <ChevronLeftIcon />
            </Button>

            <Button
              variant="outline"
              size="icon-sm"
              disabled={index === screenshots.length - 1}
              aria-label={t("tools.inventoryScanner.viewer.next")}
              onClick={() => step(1)}
            >
              <ChevronRightIcon />
            </Button>

            <DialogDescription className="shrink-0 tabular-nums">
              {t("tools.inventoryScanner.viewer.position", {
                index: index + 1,
                total: screenshots.length,
              })}
            </DialogDescription>

            <DialogTitle className="truncate text-sm leading-normal font-medium">
              {screenshot.name}
            </DialogTitle>
          </div>

          <div className="max-h-[calc(100svh-7rem)] overflow-auto rounded-md">
            <button
              type="button"
              aria-label={t(
                actualSize
                  ? "tools.inventoryScanner.viewer.fit"
                  : "tools.inventoryScanner.viewer.actualSize",
              )}
              onClick={() => setActualSize((current) => !current)}
              className={cn(
                "relative block w-fit overflow-hidden",
                actualSize ? "cursor-zoom-out" : "cursor-zoom-in",
              )}
            >
              <img
                src={screenshot.url}
                alt={screenshot.name}
                className={cn(
                  "block",
                  actualSize
                    ? "max-w-none"
                    : "max-h-[calc(100svh-7rem)] max-w-[calc(100vw-5rem)]",
                )}
              />

              {rect && size && (
                <span
                  aria-hidden
                  className="absolute rounded-md outline-3 outline-amber-400"
                  style={{
                    left: `${(rect.x / size.width) * 100}%`,
                    top: `${(rect.y / size.height) * 100}%`,
                    width: `${(rect.width / size.width) * 100}%`,
                    height: `${(rect.height / size.height) * 100}%`,
                    boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.5)",
                  }}
                />
              )}
            </button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
