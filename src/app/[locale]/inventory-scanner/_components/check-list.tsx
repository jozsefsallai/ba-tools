"use client";

import { CheckIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { CountInput } from "@/app/[locale]/inventory-scanner/_components/count-input";
import { itemName } from "@/app/[locale]/inventory-scanner/_components/inventory-section";
import { ScanCrop } from "@/app/[locale]/inventory-scanner/_components/scan-crop";
import type { ViewedScreenshot } from "@/app/[locale]/inventory-scanner/_components/screenshot-viewer";
import type {
  InventoryEntry,
  ScreenshotState,
} from "@/app/[locale]/inventory-scanner/_lib/entries";
import { DropIcon } from "@/app/[locale]/missions/_components/mission-drops";
import { Button } from "@/components/ui/button";

export function CheckList({
  entries,
  screenshots,
  onChange,
  onConfirm,
  onView,
}: {
  entries: InventoryEntry[];
  screenshots: ScreenshotState[];
  onChange: (key: string, value: string) => void;
  onConfirm: (entry: InventoryEntry) => void;
  onView: (viewed: ViewedScreenshot) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold">
          {t("tools.inventoryScanner.check.title", {
            count: entries.length,
          })}
        </h2>

        <p className="text-muted-foreground text-sm">
          {t("tools.inventoryScanner.check.description")}
        </p>
      </div>

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,21rem),1fr))] gap-3">
        {entries.map((entry) => {
          const name = itemName(entry, locale);
          const source = entry.scanned?.source;

          return (
            <li
              key={entry.key}
              className="flex items-center gap-3 rounded-md border border-amber-500/60 p-2"
            >
              {source && (
                <button
                  type="button"
                  className="focus-visible:ring-ring shrink-0 cursor-zoom-in rounded-md focus-visible:ring-2 focus-visible:outline-none"
                  aria-label={t("tools.inventoryScanner.viewer.show", {
                    name,
                  })}
                  onClick={() =>
                    onView({
                      id: screenshots[source.screenshot].id,
                      rect: source.cell.rect,
                    })
                  }
                >
                  <ScanCrop
                    screenshot={screenshots[source.screenshot]}
                    rect={source.cell.rect}
                    width={128}
                  />
                </button>
              )}

              <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <DropIcon
                    iconName={entry.item.iconName}
                    rarity={entry.item.rarity}
                    alt=""
                    className="h-8 w-10"
                  />

                  <span className="min-w-0 leading-tight font-medium">
                    {name}
                  </span>
                </div>

                {entry.scanned?.conflict && (
                  <div className="text-muted-foreground">
                    {t("tools.inventoryScanner.check.conflict")}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <CountInput
                    entry={entry}
                    name={name}
                    onChange={onChange}
                    className="h-8 min-w-0 flex-1"
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={entry.count === null}
                    onClick={() => onConfirm(entry)}
                  >
                    <CheckIcon />
                    {t("tools.inventoryScanner.check.confirm")}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
