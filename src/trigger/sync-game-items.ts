import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { logger, type Task, task } from "@trigger.dev/sdk";
import {
  type SaveGameItemsResult,
  saveGameItems,
} from "../lib/game-data/game-items.server";
import { loadMxDataSync } from "./lib/mx-data-sync";
import { type SyncGameItemsPayload, syncGameItemsPayload } from "./schemas";

export type SyncGameItemsResult = {
  gameVersion: {
    jp: string;
    global: string;
  };
  dryRun: boolean;
  extracted: number;
  saved: SaveGameItemsResult | null;
};

export const syncGameItemsTask: Task<
  "sync-game-items",
  SyncGameItemsPayload,
  SyncGameItemsResult
> = task({
  id: "sync-game-items",
  run: async (payload: SyncGameItemsPayload) => {
    const { sqlcipherKey, globalSqlcipherKey, dryRun } =
      syncGameItemsPayload.parse(payload);

    const { extractGameItems } = await loadMxDataSync();

    const workDir = await mkdtemp(join(tmpdir(), "mx-data-sync-"));
    const result = await extractGameItems({
      sqlcipherKey,
      globalSqlcipherKey,
      cacheDir: join(workDir, "cache"),
      logger,
    });

    return {
      gameVersion: result.gameVersion,
      dryRun,
      extracted: result.items.length,
      saved: dryRun ? null : await saveGameItems(result.items),
    };
  },
});
