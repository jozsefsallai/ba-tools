import { parseArgs } from "node:util";

import { resolveImageStudents } from "@/lib/game-data/existing-students.server";
import { uploadImages } from "@/lib/game-data/upload-images.server";
import {
  cacheDir,
  loadMxDataSync,
  logger,
  requireSqlcipherKey,
} from "./lib/mx-data-sync";

const root = new URL("../", import.meta.url).pathname;

const { values } = parseArgs({
  options: {
    "sqlcipher-key": { type: "string" },
    "dev-names": { type: "string" },
    "dry-run": { type: "boolean", default: false },
    "no-overwrite": { type: "boolean", default: false },
    out: { type: "string", default: `${root}.cache/game-data/images` },
  },
});

const sqlcipherKey = requireSqlcipherKey(values["sqlcipher-key"]);

const devNames = (values["dev-names"] ?? "")
  .split(",")
  .map((n) => n.trim())
  .filter(Boolean);

if (devNames.length === 0) {
  console.error("--dev-names <devName,devName,...> is required.");
  process.exit(1);
}

const { extractImageAssets } = await loadMxDataSync();

const result = await extractImageAssets({
  sqlcipherKey,
  students: await resolveImageStudents(devNames),
  outDir: values.out,
  cacheDir,
  logger,
});

const upload = values["dry-run"]
  ? null
  : await uploadImages(result.files, {
      overwrite: !values["no-overwrite"],
      logger,
    });

console.log(
  JSON.stringify(
    {
      gameVersion: result.gameVersion,
      dryRun: values["dry-run"],
      outDir: values.out,
      extracted: result.files.length,
      uploaded: upload?.uploaded ?? [],
      unchanged: upload?.unchanged ?? [],
      missing: result.missing,
      warnings: result.warnings,
    },
    null,
    2,
  ),
);

process.exit(0);
