"use client";

import type { BannerGroupEntry } from "@/app/[locale]/global/banners/types";
import dynamic from "next/dynamic";

const BannerList = dynamic(
  () =>
    import("@/app/[locale]/global/banners/_components/banner-list").then(
      (m) => m.BannerList,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-64 rounded-xl border bg-card/60 animate-pulse"
          />
        ))}
      </div>
    ),
  },
);

export function BannerListLazy({
  bannerGroups,
}: {
  bannerGroups: BannerGroupEntry[];
}) {
  return <BannerList bannerGroups={bannerGroups} />;
}
