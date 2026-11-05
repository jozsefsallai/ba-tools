import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

import type { StoryType } from "@/lib/game-data/contract";
import { buildStoryRecords } from "@/lib/game-data/story-chunks";
import { syncStoryIndex } from "@/lib/game-data/story-index.server";

import {
  cacheDir,
  loadMxDataSync,
  logger,
  parseSqlcipherKey,
} from "./lib/mx-data-sync";

const STORY_TYPES: StoryType[] = [
  "main",
  "group",
  "mini",
  "event",
  "bond",
];

const { values } = parseArgs({
  options: {
    "global-sqlcipher-key": {
      type: "string",
    },
    "story-types": {
      type: "string",
    },
    "dry-run": {
      type: "boolean",
      default: false,
    },
    out: {
      type: "string",
    },
  },
});

const globalSqlcipherKey = parseSqlcipherKey(values["global-sqlcipher-key"]);

const storyTypes = values["story-types"]
  ?.split(",")
  .map((type) => type.trim()) as StoryType[] | undefined;

for (const type of storyTypes ?? []) {
  if (!STORY_TYPES.includes(type)) {
    console.error(`Unknown story type "${type}".`);
    process.exit(1);
  }
}

const { extractStories } = await loadMxDataSync();

const result = await extractStories({
  globalSqlcipherKey,
  storyTypes,
  cacheDir,
  logger,
});

const records = buildStoryRecords(result.episodes);

if (values.out) {
  await mkdir(dirname(values.out), {
    recursive: true,
  });

  await writeFile(
    values.out,
    `${JSON.stringify(
      {
        ...result,
        records,
      },
      null,
      2,
    )}\n`,
  );

  logger.info(`Wrote ${records.length} records to ${values.out}`);
}

// With --out and --dry-run, this works without Upstash credentials.
const canSkipIndex = values.out && values["dry-run"];

const synced = canSkipIndex
  ? null
  : await syncStoryIndex(records, {
      dryRun: values["dry-run"],
      storyTypes,
      onProgress: (message) => logger.info(message),
    });

console.log(
  JSON.stringify(
    {
      gameVersion: result.gameVersion,
      episodes: result.episodes.length,
      records: records.length,
      synced,
      unmapped: result.unmapped,
      warnings: result.warnings,
    },
    null,
    2,
  ),
);

process.exit(0);
