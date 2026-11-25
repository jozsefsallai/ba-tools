"use client";

import { useLocale, useTranslations } from "next-intl";
import { CountInput } from "@/app/[locale]/inventory-scanner/_components/count-input";
import type { InventoryEntry } from "@/app/[locale]/inventory-scanner/_lib/entries";
import { DropIcon } from "@/app/[locale]/missions/_components/mission-drops";
import { findSchool, SchoolLogo } from "@/components/common/school-logo";
import type { MissingSpot } from "@/lib/inventory-scan/merge";
import type { ScanGroup } from "@/lib/inventory-scan/scope";
import { cn } from "@/lib/utils";

// Groups that fit next to each other
const SMALL_GROUPS = new Set<ScanGroup>([
  "reports",
  "stones",
  "workbooks",
]);

/** Says between which screenshots an item would be. */
export function missingText(
  t: ReturnType<typeof useTranslations<"tools.inventoryScanner.missing">>,
  { previous, next }: MissingSpot,
  label: (screenshot: number) => string,
) {
  if (previous !== null && next !== null) {
    return t("between", {
      previous: label(previous),
      next: label(next),
    });
  }

  if (previous !== null) {
    return t("after", {
      previous: label(previous),
    });
  }

  if (next !== null) {
    return t("before", {
      next: label(next),
    });
  }

  return t("nowhere");
}

export function itemName(entry: InventoryEntry, locale: string) {
  const { name, nameJP, itemId } = entry.item;

  return (
    (locale === "ja" ? (nameJP ?? name) : (name ?? nameJP)) ?? String(itemId)
  );
}

function InventoryCell({
  entry,
  onChange,
  onView,
  label,
}: {
  entry: InventoryEntry;
  onChange: (key: string, value: string) => void;
  onView: (entry: InventoryEntry) => void;
  label: (screenshot: number) => string;
}) {
  const locale = useLocale();
  const t = useTranslations();
  const missingT = useTranslations("tools.inventoryScanner.missing");
  const name = itemName(entry, locale);
  const { tier, group } = entry.item;

  return (
    <div
      className="flex w-16 flex-col items-stretch gap-1"
      title={
        entry.missing && entry.count === null
          ? `${name}\n${missingText(missingT, entry.missing, label)}`
          : name
      }
    >
      <button
        type="button"
        disabled={!entry.scanned}
        onClick={() => onView(entry)}
        aria-label={t("tools.inventoryScanner.viewer.show", {
          name,
        })}
        className="focus-visible:ring-ring relative block rounded-md enabled:cursor-zoom-in focus-visible:ring-2 focus-visible:outline-none"
      >
        <DropIcon
          iconName={entry.item.iconName}
          rarity={entry.item.rarity}
          alt={name}
          className={cn(
            "h-13 w-full",
            (entry.count === null || entry.count === 0) && "opacity-45",
          )}
        />

        {group === "blueprints" && tier > 0 && (
          <span className="bg-background/90 absolute bottom-0.5 left-0.5 rounded px-1 text-[10px] leading-4 font-bold text-sky-700 italic dark:text-sky-300">
            T{tier}
          </span>
        )}
      </button>

      <div className="relative">
        <CountInput
          entry={entry}
          name={name}
          onChange={onChange}
          className={cn(
            entry.needsCheck && "border-amber-500 ring-1 ring-amber-500",
            entry.absent && !entry.edited && "text-muted-foreground",
          )}
        />

        {entry.approximate && (
          <span
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-0.5 -translate-y-1/2 text-xs"
            title={t("tools.inventoryScanner.review.approximate")}
          >
            ≈
          </span>
        )}
      </div>
    </div>
  );
}

/** Names the school of a row of Blu-rays or tech notes. */
function SeriesLabel({ entry }: { entry: InventoryEntry }) {
  const t = useTranslations();
  const locale = useLocale();

  const school = findSchool(entry.item.series);

  return (
    <h3 className="flex items-center gap-1.5 text-sm font-medium">
      {school && <SchoolLogo school={school} className="h-5 w-[22px]" />}
      {school ? t(`common.school.${school}`) : itemName(entry, locale)}
    </h3>
  );
}

export function InventorySection({
  group,
  entries,
  onChange,
  onView,
  label,
}: {
  group: ScanGroup;
  entries: InventoryEntry[];
  onChange: (key: string, value: string) => void;
  onView: (entry: InventoryEntry) => void;
  label: (screenshot: number) => string;
}) {
  const t = useTranslations();

  // Keep the tiers of one thing together
  const series = new Map<string, InventoryEntry[]>();

  for (const entry of entries) {
    const key =
      group === "gifts" || group === "workbooks" ? "" : entry.item.series;

    series.set(key, [
      ...(series.get(key) ?? []),
      entry,
    ]);
  }

  const known = entries.filter((entry) => entry.count !== null).length;

  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-3",
        !SMALL_GROUPS.has(group) && "col-span-full",
        group === "choiceBoxes" && "min-[1700px]:col-span-3",
      )}
    >
      <div className="flex items-baseline gap-3 border-b pb-1.5">
        <h2 className="font-semibold">
          {t(`tools.inventoryScanner.groups.${group}`)}
        </h2>

        <span className="text-muted-foreground text-sm tabular-nums">
          {known}/{entries.length}
        </span>
      </div>

      <div
        className={cn(
          "grid gap-x-6 gap-y-4",
          series.size > 1 &&
            (group === "blueprints"
              ? "grid-cols-[repeat(auto-fill,min(100%,43.5rem))]"
              : "grid-cols-[repeat(auto-fill,17.25rem)]"),
        )}
      >
        {[
          ...series,
        ].map(([key, members]) => (
          <div key={key} className="flex min-w-0 flex-col gap-1.5">
            {(group === "bluRays" || group === "techNotes") && (
              <SeriesLabel entry={members[0]} />
            )}

            <div className="flex flex-wrap gap-1.5">
              {members
                .toSorted(
                  (a, b) =>
                    a.item.tier - b.item.tier || a.item.itemId - b.item.itemId,
                )
                .map((entry) => (
                  <InventoryCell
                    key={entry.key}
                    entry={entry}
                    onChange={onChange}
                    onView={onView}
                    label={label}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
