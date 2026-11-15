import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

import { saveUpcomingContent } from "@/lib/game-data/upcoming-content.server";
import {
  cacheDir,
  loadMxDataSync,
  logger,
  parseSqlcipherKey,
} from "./lib/mx-data-sync";

const { values } = parseArgs({
  options: {
    "sqlcipher-key": {
      type: "string",
    },
    "global-sqlcipher-key": {
      type: "string",
    },
    out: {
      type: "string",
    },
  },
});

const { extractUpcomingContent, getJpMaintenance } = await loadMxDataSync();

const maintenance = await getJpMaintenance({
  cacheDir,
  logger,
});

if (maintenance?.ongoing) {
  logger.warn(
    `JP maintenance runs until ${maintenance.end}; the game files may not be updated yet.`,
  );
}

const result = await extractUpcomingContent({
  sqlcipherKey: parseSqlcipherKey(values["sqlcipher-key"]),
  globalSqlcipherKey: parseSqlcipherKey(values["global-sqlcipher-key"]),
  cacheDir,
  logger,
});

if (values.out) {
  await mkdir(dirname(values.out), {
    recursive: true,
  });
  await writeFile(values.out, `${JSON.stringify(result, null, 2)}\n`);
  logger.info(`Wrote the upcoming content to ${values.out}`);
} else {
  const saved = await saveUpcomingContent(result);

  console.log(
    JSON.stringify(
      {
        gameVersion: result.gameVersion,
        raids: result.raids.length,
        events: result.events.length,
        chapters: result.chapters.length,
        ...saved,
        warnings: result.warnings,
      },
      null,
      2,
    ),
  );
}

process.exit(0);
