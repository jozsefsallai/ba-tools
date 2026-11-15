import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { logger, runs, schedules, type Task, task } from "@trigger.dev/sdk";
import type { JpMaintenance } from "../lib/game-data/contract";
import {
  type SaveUpcomingContentResult,
  saveUpcomingContent,
} from "../lib/game-data/upcoming-content.server";
import { loadMxDataSync } from "./lib/mx-data-sync";
import {
  type SyncUpcomingContentPayload,
  syncUpcomingContentPayload,
} from "./schemas";

export const SYNC_UPCOMING_CONTENT_TASK_ID = "sync-upcoming-content";

// Marks the delayed runs that wait for JP maintenance to end, so that a run
// started any other way can cancel them.
const RETRY_TAG = "upcoming-content-retry";
const RETRY_DELAY_MINUTES = 30;

// A day of checks. Maintenance has never run that long; past it, the next
// weekly run picks the data up.
const MAX_RETRIES = 48;

export type SyncUpcomingContentResult =
  | {
      status: "synced";
      gameVersion: {
        jp: string;
        global: string | null;
      };
      extracted: {
        raids: number;
        events: number;
        chapters: number;
      };
      saved: SaveUpcomingContentResult;
      cancelledRetries: number;
      warnings: string[];
    }
  | {
      status: "maintenance";
      maintenance: JpMaintenance;
      // `null` once the checks have run out
      nextCheckAt: string | null;
    };

async function cancelPendingRetries() {
  let cancelled = 0;

  for await (const run of runs.list({
    taskIdentifier: SYNC_UPCOMING_CONTENT_TASK_ID,
    status: "DELAYED",
    tag: RETRY_TAG,
  })) {
    await runs.cancel(run.id);
    cancelled++;
  }

  return cancelled;
}

export const syncUpcomingContentTask: Task<
  typeof SYNC_UPCOMING_CONTENT_TASK_ID,
  SyncUpcomingContentPayload,
  SyncUpcomingContentResult
> = task({
  id: SYNC_UPCOMING_CONTENT_TASK_ID,
  run: async (payload: SyncUpcomingContentPayload) => {
    const { sqlcipherKey, globalSqlcipherKey, source, retry } =
      syncUpcomingContentPayload.parse(payload ?? {});

    const { extractUpcomingContent, getJpMaintenance } = await loadMxDataSync();

    const workDir = await mkdtemp(join(tmpdir(), "mx-data-sync-"));
    const cacheDir = join(workDir, "cache");

    // A manual or scheduled run takes over from the checks still waiting
    const cancelledRetries =
      source === "retry" ? 0 : await cancelPendingRetries();

    if (cancelledRetries > 0) {
      logger.info(`Cancelled ${cancelledRetries} pending maintenance check(s)`);
    }

    // New game data is published during maintenance, so reading it before the
    // maintenance ends could cache last week's files for another week
    if (source !== "manual") {
      const maintenance = await getJpMaintenance({
        cacheDir,
        logger,
      });

      if (maintenance?.ongoing) {
        if (retry >= MAX_RETRIES) {
          logger.warn("JP maintenance is still ongoing, giving up");

          return {
            status: "maintenance",
            maintenance,
            nextCheckAt: null,
          };
        }

        const nextCheckAt = new Date(
          Date.now() + RETRY_DELAY_MINUTES * 60 * 1000,
        );

        await syncUpcomingContentTask.trigger(
          {
            sqlcipherKey,
            globalSqlcipherKey,
            source: "retry",
            retry: retry + 1,
          },
          {
            delay: nextCheckAt,
            tags: [
              RETRY_TAG,
            ],
          },
        );

        logger.info(
          `JP maintenance runs until ${maintenance.end}, checking again at ${nextCheckAt.toISOString()}`,
        );

        return {
          status: "maintenance",
          maintenance,
          nextCheckAt: nextCheckAt.toISOString(),
        };
      }
    }

    const result = await extractUpcomingContent({
      sqlcipherKey,
      globalSqlcipherKey,
      cacheDir,
      logger,
    });

    const saved = await saveUpcomingContent(result);

    return {
      status: "synced",
      gameVersion: result.gameVersion,
      extracted: {
        raids: result.raids.length,
        events: result.events.length,
        chapters: result.chapters.length,
      },
      saved,
      cancelledRetries,
      warnings: result.warnings,
    };
  },
});

// JP maintenance usually runs on Wednesdays from 11:00 to 17:00 JST. When it
// runs longer, the task checks again every 30 minutes.
export const syncUpcomingContentSchedule = schedules.task({
  id: "sync-upcoming-content-schedule",
  cron: {
    pattern: "30 17 * * 3",
    timezone: "Asia/Tokyo",
    environments: [
      "PRODUCTION",
    ],
  },
  run: async () => {
    const handle = await syncUpcomingContentTask.trigger({
      source: "schedule",
    });

    return {
      runId: handle.id,
    };
  },
});
