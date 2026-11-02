import { logger, type Task, task } from "@trigger.dev/sdk";
import { db } from "../lib/db";
import {
  type OffsetGameBannersPayload,
  offsetGameBannersPayload,
} from "./schemas";

export const offsetGameBanners: Task<
  "offset-game-banners",
  OffsetGameBannersPayload,
  void
> = task({
  id: "offset-game-banners",
  run: async (payload: OffsetGameBannersPayload) => {
    let data: OffsetGameBannersPayload;

    try {
      data = offsetGameBannersPayload.parse(payload);
    } catch (err) {
      logger.error("Invalid payload for offsetGameBanners", {
        error: err,
      });

      return;
    }

    const { currentStart, offsetDays } = data;

    const currentStartDate = new Date(
      Date.UTC(currentStart[0], currentStart[1] - 1, currentStart[2], 2, 0, 0),
    );

    const banners = await db.gameBanner.findMany({
      where: {
        startDate: {
          gte: currentStartDate,
        },
      },
    });

    for (const banner of banners) {
      const newStartDate = new Date(banner.startDate);
      newStartDate.setUTCDate(newStartDate.getUTCDate() + offsetDays);

      const newEndDate = new Date(banner.endDate);
      newEndDate.setUTCDate(newEndDate.getUTCDate() + offsetDays);

      await db.gameBanner.update({
        where: {
          id: banner.id,
        },
        data: {
          startDate: newStartDate,
          endDate: newEndDate,
        },
      });

      logger.info(
        `Offset banner ${banner.id} from ${banner.startDate.toISOString()} - ${banner.endDate.toISOString()} to ${newStartDate.toISOString()} - ${newEndDate.toISOString()}`,
      );
    }

    logger.info(`Offset ${banners.length} banners by ${offsetDays} days.`);
  },
});
