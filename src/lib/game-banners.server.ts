import "server-only";

import type { PublicGameBanner } from "@/app/global/banners/types";
import { db } from "@/lib/db";
import { revalidateTag, unstable_cache } from "next/cache";

export const GAME_BANNERS_CACHE_TAG = "game-banners";

export function invalidateGameBannersCache() {
  revalidateTag(GAME_BANNERS_CACHE_TAG, { expire: 0 });
}

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
