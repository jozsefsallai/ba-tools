import { BannerList } from "@/app/global/banners/_components/banner-list";
import type { BannerGroups } from "@/app/global/banners/types";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db";
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

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getBannerGroups(): Promise<BannerGroups> {
  const banners = await db.gameBanner.findMany({
    where: {
      endDate: {
        gt: new Date(),
      },
    },
    orderBy: {
      startDate: "asc",
    },
    include: {
      pickupStudents: true,
    },
  });

  const groups: BannerGroups = new Map();

  for (const banner of banners) {
    const key = [banner.startDate.getTime(), banner.endDate.getTime()].join(
      ",",
    );

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)?.push(banner);
  }

  return groups;
}

export default async function BannersPage() {
  const bannerGroups = await getBannerGroups();
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
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

      <BannerList bannerGroups={bannerGroups} />
    </div>
  );
}
