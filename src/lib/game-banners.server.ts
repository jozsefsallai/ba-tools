import "server-only";

import { tasks } from "@trigger.dev/sdk";
import { revalidateTag, unstable_cache } from "next/cache";
import { after } from "next/server";
import type { PublicGameBanner } from "@/app/[locale]/global/banners/types";
import {
  ARONABOT_BANNER_SYNC_DEBOUNCE,
  ARONABOT_SYNC_BANNERS_TASK_ID,
} from "@/lib/aronabot/banner-sync";
import { db } from "@/lib/db";
import type { syncAronaBotBannersTask } from "@/trigger/aronabot-sync-banners";

export const GAME_BANNERS_CACHE_TAG = "game-banners";

export function invalidateGameBannersCache() {
  revalidateTag(GAME_BANNERS_CACHE_TAG, {
    expire: 0,
  });
}

function scheduleAronaBotBannerSync() {
  if (!process.env.TRIGGER_SECRET_KEY) {
    return;
  }

  after(async () => {
    try {
      await tasks.trigger<typeof syncAronaBotBannersTask>(
        ARONABOT_SYNC_BANNERS_TASK_ID,
        {
          source: "banners-changed",
        },
        {
          // Repeated changes are debounced into one sync.
          debounce: ARONABOT_BANNER_SYNC_DEBOUNCE,
        },
      );
    } catch (error) {
      console.error("Failed to schedule the AronaBot banner sync", error);
    }
  });
}

export function onGameBannersChanged() {
  invalidateGameBannersCache();
  scheduleAronaBotBannerSync();
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
  [
    "public-game-banners",
  ],
  {
    revalidate: 86_400,
    tags: [
      GAME_BANNERS_CACHE_TAG,
    ],
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
