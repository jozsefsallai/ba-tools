import { BannerList } from "@/app/global/banners/_components/banner-list";
import type { BannerGroups } from "@/app/global/banners/types";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upcoming Global Banners - Joe's Blue Archive Tools",
  description:
    "View upcoming global banners in Blue Archive (based on the JP schedule).",
  twitter: {
    card: "summary",
  },
};

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

  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">Upcoming Global Banners</h1>
        </div>

        <p>
          On this page you may view the upcoming global banners in Blue Archive.
          Please keep in mind that the schedule predictions are based on the JP
          server's banner release schedule and are subject to change on global.
        </p>

        <p className="bg-card p-4 rounded-md border text-sm">
          <strong>Important:</strong> Blue Archive global is currently on an
          accelerated schedule in order to reduce the gap between the JP and the
          global servers. As a result, some of these banners could be merged,
          shortened, or skipped entirely.
        </p>
      </div>

      <Separator />

      <BannerList bannerGroups={bannerGroups} />
    </div>
  );
}
