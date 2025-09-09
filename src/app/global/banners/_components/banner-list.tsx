import { BannerGroup } from "@/app/global/banners/_components/banner-group";
import type { BannerGroups } from "@/app/global/banners/types";

export type BannerListProps = {
  bannerGroups: BannerGroups;
};

export function BannerList({ bannerGroups }: BannerListProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {Array.from(bannerGroups.entries()).map(([key, banners]) => {
        const dates = key.split(",").map((t) => Number.parseInt(t, 10)) as [
          number,
          number,
        ];
        return <BannerGroup key={key} dates={dates} banners={banners} />;
      })}
    </section>
  );
}
