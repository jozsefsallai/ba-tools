import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { logger, type Task, task } from "@trigger.dev/sdk";
import { buildStoryRecords } from "../lib/game-data/story-chunks";
import {
  type SyncStoryIndexResult,
  syncStoryIndex,
} from "../lib/game-data/story-index.server";
import { loadMxDataSync } from "./lib/mx-data-sync";
import { type SyncStoriesPayload, syncStoriesPayload } from "./schemas";

export type SyncStoriesResult = {
  gameVersion: string;
  dryRun: boolean;
  extracted: {
    episodes: number;
    records: number;
  };
  synced: SyncStoryIndexResult;
  unmapped: {
    groups: number;
    characters: number;
    sampleGroupIds: number[];
  };
  warnings: string[];
};

export const syncStoriesTask: Task<
  "sync-stories",
  SyncStoriesPayload,
  SyncStoriesResult
> = task({
  id: "sync-stories",
  run: async (payload: SyncStoriesPayload) => {
    const { globalSqlcipherKey, storyTypes, dryRun } =
      syncStoriesPayload.parse(payload);

    const { extractStories } = await loadMxDataSync();

    const workDir = await mkdtemp(join(tmpdir(), "mx-data-sync-"));
    const result = await extractStories({
      globalSqlcipherKey,
      storyTypes,
      cacheDir: join(workDir, "cache"),
      logger,
    });

    const records = buildStoryRecords(result.episodes);
    const synced = await syncStoryIndex(records, {
      dryRun,
      storyTypes,
      onProgress: (message) => logger.info(message),
    });

    return {
      gameVersion: result.gameVersion,
      dryRun,
      extracted: {
        episodes: result.episodes.length,
        records: records.length,
      },
      synced,
      unmapped: result.unmapped,
      warnings: result.warnings,
    };
  },
});
