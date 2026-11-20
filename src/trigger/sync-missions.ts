import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { logger, type Task, task } from "@trigger.dev/sdk";
import {
  type SaveMissionsResult,
  saveMissions,
} from "../lib/game-data/missions.server";
import { loadMxDataSync } from "./lib/mx-data-sync";
import { type SyncMissionsPayload, syncMissionsPayload } from "./schemas";

export type SyncMissionsResult = {
  gameVersion: {
    jp: string;
    global: string | null;
  };
  dryRun: boolean;
  extracted: {
    missions: number;
    items: number;
  };
  saved: SaveMissionsResult | null;
  warnings: string[];
};

export const syncMissionsTask: Task<
  "sync-missions",
  SyncMissionsPayload,
  SyncMissionsResult
> = task({
  id: "sync-missions",
  run: async (payload: SyncMissionsPayload) => {
    const { sqlcipherKey, globalSqlcipherKey, dryRun } =
      syncMissionsPayload.parse(payload);

    const { extractMissions } = await loadMxDataSync();

    const workDir = await mkdtemp(join(tmpdir(), "mx-data-sync-"));
    const result = await extractMissions({
      sqlcipherKey,
      globalSqlcipherKey,
      cacheDir: join(workDir, "cache"),
      logger,
    });

    return {
      gameVersion: result.gameVersion,
      dryRun,
      extracted: {
        missions: result.missions.length,
        items: result.items.length,
      },
      // Saving works out every mission's routes, which takes about half a minute.
      saved: dryRun
        ? null
        : await saveMissions(result, (message) => logger.info(message)),
      warnings: result.warnings,
    };
  },
});
