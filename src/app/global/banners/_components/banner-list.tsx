"use client";

import { BannerGroup } from "@/app/global/banners/_components/banner-group";
import { BannersTooltipProvider } from "@/app/global/banners/_components/banners-tooltip-provider";
import type { BannerGroupEntry } from "@/app/global/banners/types";

export type BannerListProps = {
  bannerGroups: BannerGroupEntry[];
};

export function BannerList({ bannerGroups }: BannerListProps) {
  return (
    <BannersTooltipProvider>
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {bannerGroups.map((group) => (
          <BannerGroup
            key={`${group.startTime},${group.endTime}`}
            dates={[group.startTime, group.endTime]}
            banners={group.banners}
          />
        ))}
      </section>
    </BannersTooltipProvider>
  );
}
