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
import { getAnnouncementMessages } from "./lib/aronabot/announcement";
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
  type RawBanner,
  type SyncAronaBotBannersPayload,
  syncAronaBotBannersPayload,
  type UpdateAronaBotBannersPayload,
  updateAronaBotBannersPayload,
} from "./schemas";

type UpdateBannersResult = {
  banners: string[];
  reset: Partial<Record<BannerKind, ResetCountersResult>>;
  messageIds: string[];
};

// Saves the new banners of the given regions, resets their recruitment points
// and total pulls, then posts one announcement for all of them. Every step is
// safe to repeat, so a retry finishes what a failed attempt started without
// announcing twice.
export const updateAronaBotBannersTask: Task<
  "aronabot-update-banners",
  UpdateAronaBotBannersPayload,
  UpdateBannersResult
> = task({
  id: "aronabot-update-banners",
  queue: {
    concurrencyLimit: 1,
  },
  run: async (payload: UpdateAronaBotBannersPayload) => {
    const { kinds, banners, date } =
      updateAronaBotBannersPayload.parse(payload);

    // Once the banners are saved, the next sync sees the regions as up to
    // date and won't redo the reset or the announcement, so check what they
    // need before saving anything
    const missing = [
      "ARONABOT_REDIS_URL",
      "ARONABOT_DISCORD_TOKEN",
      "ARONABOT_ANNOUNCEMENT_CHANNEL_ID",
    ].filter((name) => !process.env[name]);

    if (missing.length > 0) {
      throw new AbortTaskRunError(`Missing env vars: ${missing.join(", ")}`);
    }

    const syncDate = new Date(date);

    const saved = await setBanners(kinds, banners, syncDate);

    const reset: UpdateBannersResult["reset"] = {};
    for (const kind of kinds) {
      reset[kind] = await resetRecruitmentCounters(kind);
      logger.info(
        `Reset ${kind} recruitment points (${reset[kind].points} keys) and total pulls (${reset[kind].pulls} keys)`,
      );
    }

    const messages = await getAnnouncementMessages(saved, syncDate);
    const messageIds = await publishAnnouncement(
      messages,
      `${kinds.join("+")}:${date}:${getBannerSetSignature(saved)}`,
    );

    return {
      banners: saved.map((b) => b.id),
      reset,
      messageIds,
    };
  },
});

type SyncResult = {
  regions: Record<BannerKind, "unchanged" | "no-banners" | "updated">;
  update: UpdateBannersResult | null;
};

export const syncAronaBotBannersTask: Task<
  typeof ARONABOT_SYNC_BANNERS_TASK_ID,
  SyncAronaBotBannersPayload,
  SyncResult
> = task({
  id: ARONABOT_SYNC_BANNERS_TASK_ID,
  queue: {
    concurrencyLimit: 1,
  },
  run: async (payload: SyncAronaBotBannersPayload) => {
    const { source } = syncAronaBotBannersPayload.parse(payload ?? {});
    logger.info(`Syncing AronaBot banners (${source})`);

    const now = new Date();
    const regions = {} as SyncResult["regions"];
    const changedKinds: BannerKind[] = [];
    const changedBanners: RawBanner[] = [];
    const signatures: string[] = [];

    for (const kind of [
      "Global",
      "JP",
    ] as const) {
      const desired = await getDesiredBanners(kind, now);

      if (desired.length === 0) {
        logger.warn(`No ${kind} banners found in the GameBanner table`);
        regions[kind] = "no-banners";
        continue;
      }

      const signature = getBannerSetSignature(desired);
      const current = await getCurrentBannerSetSignature(kind);

      if (signature === current) {
        logger.info(`${kind} banners are up to date (${signature})`);
        regions[kind] = "unchanged";
        continue;
      }

      logger.info(`Updating ${kind} banners: ${current} -> ${signature}`);
      regions[kind] = "updated";
      changedKinds.push(kind);
      changedBanners.push(...desired);
      signatures.push(`${kind}=${signature}`);
    }

    if (changedKinds.length === 0) {
      return {
        regions,
        update: null,
      };
    }

    const key = await idempotencyKeys.create(
      [
        "aronabot-banners",
        createHash("sha256").update(signatures.join(";")).digest("hex"),
      ],
      {
        scope: "global",
      },
    );

    const update = await updateAronaBotBannersTask
      .triggerAndWait(
        {
          kinds: changedKinds,
          banners: changedBanners,
          date: now.toISOString(),
        },
        {
          idempotencyKey: key,
          idempotencyKeyTTL: "1d",
        },
      )
      .unwrap();

    return {
      regions,
      update,
    };
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
