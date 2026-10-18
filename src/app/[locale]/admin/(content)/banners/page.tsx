import { AdminBannersView } from "@/app/[locale]/admin/(content)/banners/_components/admin-banners-view";
import type { AdminBanner } from "@/app/[locale]/admin/(content)/banners/types";
import { serializeGameBanner } from "@/lib/admin/serialize-game-banner";
import { db } from "@/lib/db";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { getLocale } from "next-intl/server";

export async function generateMetadata() {
  return getCardMetadata("admin-banners", await getLocale());
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
