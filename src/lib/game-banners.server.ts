import "server-only";

import { db } from "@/lib/db";
import { revalidateTag, unstable_cache } from "next/cache";
import type { Student } from "~prisma";

export const GAME_BANNERS_CACHE_TAG = "game-banners";

export function invalidateGameBannersCache() {
  revalidateTag(GAME_BANNERS_CACHE_TAG, { expire: 0 });
}

export type PublicBannerStudent = {
  id: string;
  devName: string;
  schaleDbId: number;
  name: string;
  lastName: string;
  firstName: string;
  combatRole: Student["combatRole"];
  attackType: Student["attackType"];
  rarity: number;
  isFestGlobal: boolean;
  isLimitedGlobal: boolean;
};

export type PublicGameBanner = {
  id: string;
  name: string | null;
  startDate: Date;
  endDate: Date;
  freePulls: number;
  isSelectablePickup: boolean;
  createdAt: Date;
  updatedAt: Date;
  pickupStudents: PublicBannerStudent[];
};

const getCachedGameBannersData = unstable_cache(
  async (): Promise<PublicGameBanner[]> => {
    return db.gameBanner.findMany({
      where: {
        endDate: {
          gt: new Date(),
        },
      },
      orderBy: {
        startDate: "asc",
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        freePulls: true,
        isSelectablePickup: true,
        createdAt: true,
        updatedAt: true,
        pickupStudents: {
          select: {
            id: true,
            devName: true,
            schaleDbId: true,
            name: true,
            lastName: true,
            firstName: true,
            combatRole: true,
            attackType: true,
            rarity: true,
            isFestGlobal: true,
            isLimitedGlobal: true,
          },
        },
      },
    });
  },
  ["public-game-banners"],
  {
    revalidate: 86_400,
    tags: [GAME_BANNERS_CACHE_TAG],
  },
);

export async function getCachedGameBanners(): Promise<PublicGameBanner[]> {
  const banners = await getCachedGameBannersData();

  return banners.map((banner) => ({
    ...banner,
    startDate: new Date(banner.startDate),
    endDate: new Date(banner.endDate),
    createdAt: new Date(banner.createdAt),
    updatedAt: new Date(banner.updatedAt),
  }));
}
