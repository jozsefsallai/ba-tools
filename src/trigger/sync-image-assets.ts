import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Task, logger, task } from "@trigger.dev/sdk";
import { resolveImageStudents } from "../lib/game-data/existing-students.server";
import { uploadImages } from "../lib/game-data/upload-images.server";
import { loadMxDataSync } from "./lib/mx-data-sync";
import { type SyncImageAssetsPayload, syncImageAssetsPayload } from "./schemas";

export type SyncImageAssetsResult = {
  gameVersion: string;
  dryRun: boolean;
  extracted: string[];
  uploaded: string[];
  unchanged: string[];
  missing: string[];
  warnings: string[];
};

export const syncImageAssetsTask: Task<
  "sync-image-assets",
  SyncImageAssetsPayload,
  SyncImageAssetsResult
> = task({
  id: "sync-image-assets",
  run: async (payload: SyncImageAssetsPayload) => {
    const { sqlcipherKey, devNames, dryRun, overwrite } =
      syncImageAssetsPayload.parse(payload);

    const { extractImageAssets } = await loadMxDataSync();

    const workDir = await mkdtemp(join(tmpdir(), "mx-data-sync-"));
    const result = await extractImageAssets({
      sqlcipherKey,
      students: await resolveImageStudents(devNames),
      outDir: join(workDir, "images"),
      cacheDir: join(workDir, "cache"),
      logger,
    });

    const upload = dryRun
      ? { uploaded: [], unchanged: [] }
      : await uploadImages(result.files, { overwrite, logger });

    return {
      gameVersion: result.gameVersion,
      dryRun,
      extracted: result.files.map((f) => f.key),
      uploaded: upload.uploaded,
      unchanged: upload.unchanged,
      missing: result.missing,
      warnings: result.warnings,
    };
  },
});
