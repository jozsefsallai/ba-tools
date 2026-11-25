"use client";

import { useTranslations } from "next-intl";
import { DropIcon } from "@/app/[locale]/missions/_components/mission-drops";
import { SCAN_GROUPS, type ScopedItem } from "@/lib/inventory-scan/scope";
import { cn } from "@/lib/utils";

const SAMPLE_ICONS = 4;

export function ScanInstructions() {
  const t = useTranslations();

  return (
    <ul className="text-muted-foreground list-disc space-y-1.5 pl-5 text-sm">
      <li>{t("tools.inventoryScanner.instructions.lists")}</li>
      <li>{t("tools.inventoryScanner.instructions.sort")}</li>
      <li>{t("tools.inventoryScanner.instructions.scroll")}</li>
      <li>{t("tools.inventoryScanner.instructions.recording")}</li>
    </ul>
  );
}

function ListSketch({ shared }: { shared: number }) {
  return (
    <div className="flex flex-col gap-1 overflow-hidden rounded-md border px-2 pt-1.5">
      {[
        0,
        1,
        2,
      ].map((row) => (
        <div key={row} className="flex shrink-0 gap-1">
          {[
            0,
            1,
            2,
            3,
            4,
          ].map((column) => (
            <span
              key={column}
              className={cn(
                "h-7 w-8 -skew-x-6 rounded-sm",
                row === shared ? "bg-primary/70" : "bg-muted",
                row === 2 && "h-4 rounded-b-none",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function OverlapSketch() {
  const t = useTranslations();

  return (
    <figure className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3" aria-hidden>
        <ListSketch shared={2} />
        <ListSketch shared={0} />
      </div>
      <figcaption className="text-muted-foreground text-sm">
        {t("tools.inventoryScanner.instructions.overlap")}
      </figcaption>
    </figure>
  );
}

export function StartGuide({ items }: { items: ScopedItem[] }) {
  const t = useTranslations();

  return (
    <>
      <section className="flex flex-col gap-4">
        <h2 className="font-semibold">
          {t("tools.inventoryScanner.instructions.title")}
        </h2>

        <ScanInstructions />
        <OverlapSketch />
      </section>

      <section className="flex flex-col gap-4 lg:col-span-2">
        <h2 className="border-b pb-1.5 font-semibold">
          {t("tools.inventoryScanner.instructions.collects")}
        </h2>

        <ul className="grid grid-cols-[repeat(auto-fill,minmax(14.5rem,1fr))] gap-x-6 gap-y-4">
          {SCAN_GROUPS.map((group) => {
            const members = items.filter((item) => item.group === group);
            const step = Math.max(1, Math.floor(members.length / SAMPLE_ICONS));

            return (
              <li key={group} className="flex flex-col gap-1.5">
                <h3 className="text-sm font-medium">
                  {t(`tools.inventoryScanner.groups.${group}`)}
                </h3>

                <div className="flex gap-1.5">
                  {members
                    .filter((_, i) => i % step === 0)
                    .slice(0, SAMPLE_ICONS)
                    .map((item) => (
                      <DropIcon
                        key={item.itemId}
                        iconName={item.iconName}
                        rarity={item.rarity}
                        alt=""
                        className="h-11 w-13"
                      />
                    ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
