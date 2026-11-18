import { createHash } from "node:crypto";
import {
  AbortTaskRunError,
  idempotencyKeys,
  logger,
  schedules,
  type Task,
  task,
} from "@trigger.dev/sdk";
import { ARONABOT_SYNC_BANNERS_TASK_ID } from "../lib/aronabot/banner-sync";
import type { BannerKind } from "../lib/db/client";
import { getRegionAnnouncementMessages } from "./lib/aronabot/announcement";
import { publishAnnouncement } from "./lib/aronabot/discord";
import {
  getBannerSetSignature,
  getCurrentBannerSetSignature,
  getDesiredBanners,
} from "./lib/aronabot/game-banners";
import {
  type ResetCountersResult,
  resetRecruitmentCounters,
} from "./lib/aronabot/redis";
import { setBanners } from "./lib/aronabot/set-banners";
import {
  type SyncAronaBotBannersPayload,
  syncAronaBotBannersPayload,
  type UpdateAronaBotRegionPayload,
  updateAronaBotRegionPayload,
} from "./schemas";

type UpdateRegionResult = {
  banners: string[];
  reset: ResetCountersResult;
  messageIds: string[];
};

export const updateAronaBotRegionTask: Task<
  "aronabot-update-region",
  UpdateAronaBotRegionPayload,
  UpdateRegionResult
> = task({
  id: "aronabot-update-region",
  queue: {
    concurrencyLimit: 1,
  },
  run: async (payload: UpdateAronaBotRegionPayload) => {
    const { kind, banners, date } = updateAronaBotRegionPayload.parse(payload);

    const missing = [
      "ARONABOT_REDIS_URL",
      "ARONABOT_DISCORD_TOKEN",
      "ARONABOT_ANNOUNCEMENT_CHANNEL_ID",
    ].filter((name) => !process.env[name]);

    if (missing.length > 0) {
      throw new AbortTaskRunError(`Missing env vars: ${missing.join(", ")}`);
    }

    const syncDate = new Date(date);

    const saved = await setBanners(
      [
        kind,
      ],
      banners,
      syncDate,
    );

    const reset = await resetRecruitmentCounters(kind);
    logger.info(
      `Reset ${kind} recruitment points (${reset.points} keys) and total pulls (${reset.pulls} keys)`,
    );

    const messages = await getRegionAnnouncementMessages(kind, saved, syncDate);
    const messageIds = await publishAnnouncement(
      messages,
      `${kind}:${date}:${getBannerSetSignature(saved)}`,
    );

    return {
      banners: saved.map((b) => b.id),
      reset,
      messageIds,
    };
  },
});

type RegionSyncResult =
  | {
      kind: BannerKind;
      status: "unchanged" | "no-banners";
    }
  | {
      kind: BannerKind;
      status: "updated";
      result: UpdateRegionResult;
    };

export const syncAronaBotBannersTask: Task<
  typeof ARONABOT_SYNC_BANNERS_TASK_ID,
  SyncAronaBotBannersPayload,
  RegionSyncResult[]
> = task({
  id: ARONABOT_SYNC_BANNERS_TASK_ID,
  queue: {
    concurrencyLimit: 1,
  },
  run: async (payload: SyncAronaBotBannersPayload) => {
    const { source } = syncAronaBotBannersPayload.parse(payload ?? {});
    logger.info(`Syncing AronaBot banners (${source})`);

    const now = new Date();
    const results: RegionSyncResult[] = [];

    for (const kind of [
      "Global",
      "JP",
    ] as const) {
      const desired = await getDesiredBanners(kind, now);

      if (desired.length === 0) {
        logger.warn(`No ${kind} banners found in the GameBanner table`);
        results.push({
          kind,
          status: "no-banners",
        });
        continue;
      }

      const signature = getBannerSetSignature(desired);
      const current = await getCurrentBannerSetSignature(kind);

      if (signature === current) {
        logger.info(`${kind} banners are up to date (${signature})`);
        results.push({
          kind,
          status: "unchanged",
        });
        continue;
      }

      logger.info(`Updating ${kind} banners: ${current} -> ${signature}`);

      const key = await idempotencyKeys.create(
        [
          "aronabot-banners",
          kind,
          createHash("sha256").update(signature).digest("hex"),
        ],
        {
          scope: "global",
        },
      );

      const result = await updateAronaBotRegionTask
        .triggerAndWait(
          {
            kind,
            banners: desired,
            date: now.toISOString(),
          },
          {
            idempotencyKey: key,
            idempotencyKeyTTL: "1d",
          },
        )
        .unwrap();

      results.push({
        kind,
        status: "updated",
        result,
      });
    }

    return results;
  },
});

export const syncAronaBotBannersSchedule = schedules.task({
  id: "aronabot-sync-banners-schedule",
  cron: {
    pattern: "5 2 * * *",
    timezone: "UTC",
    environments: [
      "PRODUCTION",
    ],
  },
  run: async () => {
    const handle = await syncAronaBotBannersTask.trigger({
      source: "schedule",
    });

    return {
      runId: handle.id,
    };
  },
});
