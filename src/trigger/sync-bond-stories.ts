import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { logger, type Task, task } from "@trigger.dev/sdk";
import {
  type SaveBondStoriesResult,
  saveBondStories,
} from "../lib/game-data/bond-stories.server";
import { resolveSkillStudents } from "../lib/game-data/student-skills.server";
import { loadMxDataSync } from "./lib/mx-data-sync";
import { type SyncBondStoriesPayload, syncBondStoriesPayload } from "./schemas";

export type SyncBondStoriesResult = {
  gameVersion: {
    jp: string;
    global: string | null;
  };
  dryRun: boolean;
  extracted: {
    episodes: number;
  };
  saved: SaveBondStoriesResult | null;
  missing: string[];
  warnings: string[];
};

export const syncBondStoriesTask: Task<
  "sync-bond-stories",
  SyncBondStoriesPayload,
  SyncBondStoriesResult
> = task({
  id: "sync-bond-stories",
  run: async (payload: SyncBondStoriesPayload) => {
    const { sqlcipherKey, globalSqlcipherKey, devNames, dryRun } =
      syncBondStoriesPayload.parse(payload);

    const { extractBondStories } = await loadMxDataSync();

    const workDir = await mkdtemp(join(tmpdir(), "mx-data-sync-"));
    const result = await extractBondStories({
      sqlcipherKey,
      globalSqlcipherKey,
      students: await resolveSkillStudents(devNames),
      cacheDir: join(workDir, "cache"),
      logger,
    });

    return {
      gameVersion: result.gameVersion,
      dryRun,
      extracted: {
        episodes: result.episodes.length,
      },
      saved: dryRun ? null : await saveBondStories(result),
      missing: result.missing,
      warnings: result.warnings,
    };
  },
});
