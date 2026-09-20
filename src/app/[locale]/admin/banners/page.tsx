import { AdminBannersView } from "@/app/[locale]/admin/banners/_components/admin-banners-view";
import type { AdminBanner } from "@/app/[locale]/admin/banners/types";
import { serializeGameBanner } from "@/lib/admin/serialize-game-banner";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("tools.admin.banners.title")} - ${t("common.appName")}`,
    description: t("tools.admin.banners.description"),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getAdminBanners(): Promise<AdminBanner[]> {
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

  return banners.map(serializeGameBanner);
}

export default async function AdminBannersPage() {
  const banners = await getAdminBanners();

  return <AdminBannersView initialBanners={banners} />;
}
