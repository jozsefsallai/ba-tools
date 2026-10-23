import { parseArgs } from "node:util";

import {
  resolveAllImageStudents,
  resolveImageStudents,
} from "@/lib/game-data/existing-students.server";
import { uploadImages } from "@/lib/game-data/upload-images.server";
import {
  cacheDir,
  loadMxDataSync,
  logger,
  parseSqlcipherKey,
} from "./lib/mx-data-sync";

const root = new URL("../", import.meta.url).pathname;

const { values } = parseArgs({
  options: {
    "sqlcipher-key": { type: "string" },
    "dev-names": { type: "string" },
    all: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    "no-overwrite": { type: "boolean", default: false },
    "no-spine-sprites": { type: "boolean", default: false },
    "no-memorial-lobbies": { type: "boolean", default: false },
    "render-threads": { type: "string" },
    fresh: { type: "boolean", default: false },
    out: { type: "string", default: `${root}.cache/game-data/images` },
  },
});

const sqlcipherKey = parseSqlcipherKey(values["sqlcipher-key"]);

const devNames = (values["dev-names"] ?? "")
  .split(",")
  .map((n) => n.trim())
  .filter(Boolean);

if (values.all === devNames.length > 0) {
  console.error("Pass either --dev-names <devName,devName,...> or --all.");
  process.exit(1);
}

const { extractImageAssets } = await loadMxDataSync();

const result = await extractImageAssets({
  sqlcipherKey,
  students: values.all
    ? await resolveAllImageStudents()
    : await resolveImageStudents(devNames),
  outDir: values.out,
  cacheDir,
  logger,
  spineSprites: !values["no-spine-sprites"],
  memorialLobbies: !values["no-memorial-lobbies"],
  reuseExisting: !values.fresh,
  renderThreads:
    values["render-threads"] === undefined
      ? undefined
      : Number(values["render-threads"]),
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
