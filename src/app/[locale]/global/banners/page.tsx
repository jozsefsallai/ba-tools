import { BannerListLazy } from "@/app/[locale]/global/banners/_components/banner-list-lazy";
import type { BannerGroupEntry } from "@/app/[locale]/global/banners/types";
import { Separator } from "@/components/ui/separator";
import { getCachedGameBanners } from "@/lib/game-banners.server";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("static.banners.title")} - ${t("common.appName")}`,
    description: t("static.banners.description"),
    twitter: {
      card: "summary",
    },
  };
}

async function getBannerGroups(): Promise<BannerGroupEntry[]> {
  const banners = await getCachedGameBanners();

  const groups = new Map<string, BannerGroupEntry>();

  for (const banner of banners) {
    const startTime = banner.startDate.getTime();
    const endTime = banner.endDate.getTime();
    const key = `${startTime},${endTime}`;

    if (!groups.has(key)) {
      groups.set(key, { startTime, endTime, banners: [] });
    }

    groups.get(key)?.banners.push(banner);
  }

  return Array.from(groups.values());
}

export default async function BannersPage() {
  const bannerGroups = await getBannerGroups();
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">{t("static.banners.title")}</h1>
        </div>

        <p>{t("static.banners.description")}</p>

        <p className="bg-card p-4 rounded-md border text-sm">
          {t.rich("static.banners.notice", {
            strong: (children) => <strong>{children}</strong>,
          })}
        </p>
      </div>

      <Separator />

      <BannerListLazy bannerGroups={bannerGroups} />
    </div>
  );
}
