"use client";

import { RoadmapItemDetails } from "@/components/roadmap/roadmap-item-details";
import { useBirthdaySources } from "@/components/roadmap/use-birthday-sources";
import { useRoadmapLabels } from "@/components/roadmap/use-roadmap-labels";
import { getCategorySwatch, getItemSwatch } from "@/lib/roadmap/constants";
import {
  generateBirthdays,
  generateShopResets,
  isDotItem,
} from "@/lib/roadmap/layout";
import { startOfMonth } from "@/lib/roadmap/time-zone";
import type { RoadmapCategory, RoadmapItem } from "@/lib/roadmap/types";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const SHOP_RESET_MONTHS = 6;

export type RoadmapListProps = {
  items: RoadmapItem[];
  rangeStart: Date;
  categories: RoadmapCategory[];
};

export function RoadmapList({
  items,
  rangeStart,
  categories,
}: RoadmapListProps) {
  const labels = useRoadmapLabels();
  const birthdaySources = useBirthdaySources();

  const groups = useMemo(() => {
    const tz = labels.tz;
    const shopResetsEnd = startOfMonth(rangeStart, tz, SHOP_RESET_MONTHS);

    const visible = [
      ...items,
      ...(categories.includes("birthday")
        ? generateBirthdays(rangeStart, shopResetsEnd, birthdaySources, tz)
        : []),
      ...(categories.includes("shopReset")
        ? generateShopResets(rangeStart, shopResetsEnd)
        : []),
    ]
      .filter(
        (item) =>
          categories.includes(item.kind) &&
          new Date(isDotItem(item) ? item.startDate : item.endDate) >=
            rangeStart,
      )
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime() ||
          categories.indexOf(a.kind) - categories.indexOf(b.kind),
      );

    const map = new Map<string, { month: Date; items: RoadmapItem[] }>();

    for (const item of visible) {
      // ongoing items are listed under the current month
      const start = new Date(
        Math.max(new Date(item.startDate).getTime(), rangeStart.getTime()),
      );
      const month = startOfMonth(start, tz);
      const key = month.toISOString();

      if (!map.has(key)) {
        map.set(key, { month, items: [] });
      }
      map.get(key)?.items.push(item);
    }

    return Array.from(map.entries());
  }, [items, categories, rangeStart, birthdaySources, labels.tz]);

  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {labels.t("static.roadmap.empty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map(([key, group]) => (
        <section key={key} className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">
            {labels.formatMonth(group.month)}
          </h2>

          <ul className="flex flex-col divide-y rounded-md border bg-card">
            {group.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col md:flex-row gap-1 md:gap-4 p-3"
              >
                <div className="md:w-40 shrink-0">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-xs font-semibold",
                      getItemSwatch(item).badge,
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        getCategorySwatch(item.kind).dot,
                      )}
                    />
                    {labels.category(item.kind)}
                  </span>
                </div>

                <div className="min-w-0 flex-1 text-sm">
                  <RoadmapItemDetails item={item} labels={labels} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
