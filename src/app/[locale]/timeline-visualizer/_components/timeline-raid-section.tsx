"use client";

import { ChevronDownIcon, SwordsIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RaidChips } from "@/components/raid/raid-chips";
import { RaidDetailsForm } from "@/components/raid/raid-details-form";
import { RaidThumbnail } from "@/components/raid/raid-thumbnail";
import { Card, CardContent } from "@/components/ui/card";
import type { RaidInfo } from "@/lib/raid-info";
import { getRaidBossLabel } from "@/lib/raid-labels";
import type { RoadmapRaidItem } from "@/lib/roadmap/types";
import { cn } from "@/lib/utils";

export type TimelineRaidSectionProps = {
  raid: RaidInfo | undefined;
  setRaid: (raid: RaidInfo | undefined) => void;
  roadmapRaids: RoadmapRaidItem[];
};

export function TimelineRaidSection({
  raid,
  setRaid,
  roadmapRaids,
}: TimelineRaidSectionProps) {
  const t = useTranslations();
  const [collapsed, setCollapsed] = useState(true);

  const boss = raid ? getRaidBossLabel(t, raid.type, raid.boss) : undefined;

  return (
    <Card className="gap-0 py-0">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-3 px-6 py-4 text-left max-md:px-4"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((prev) => !prev)}
      >
        {collapsed && raid ? (
          <RaidThumbnail
            type={raid.type}
            boss={raid.boss}
            className="-my-1 h-8 w-14 rounded-sm"
          />
        ) : (
          <SwordsIcon className="size-4 shrink-0 text-muted-foreground" />
        )}

        <span className="shrink-0 font-semibold">
          {t("tools.raidDetails.title")}
        </span>

        {collapsed && raid && (
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {boss && (
              <span className="min-w-0 truncate text-sm text-muted-foreground">
                {boss}
              </span>
            )}
            <RaidChips raid={raid} />
          </span>
        )}

        {!raid && (
          <span className="min-w-0 truncate text-sm text-muted-foreground">
            {t("tools.raidDetails.optional")}
          </span>
        )}

        <ChevronDownIcon
          className={cn(
            "ml-auto size-4 shrink-0 text-muted-foreground transition-transform",
            collapsed && "-rotate-90",
          )}
        />
      </button>

      {!collapsed && (
        <CardContent className="border-t px-6 py-4 max-md:px-4">
          <RaidDetailsForm
            scope="timeline"
            value={raid}
            onChange={setRaid}
            roadmapRaids={roadmapRaids}
          />
        </CardContent>
      )}
    </Card>
  );
}
