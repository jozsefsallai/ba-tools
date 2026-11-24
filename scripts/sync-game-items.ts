import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

import { saveGameItems } from "@/lib/game-data/game-items.server";
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

const { extractGameItems } = await loadMxDataSync();

const result = await extractGameItems({
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
  logger.info(`Wrote ${result.items.length} items to ${values.out}`);
} else {
  const saved = await saveGameItems(result.items);
  console.log(
    JSON.stringify(
      {
        gameVersion: result.gameVersion,
        ...saved,
      },
      null,
      2,
    ),
  );
}

process.exit(0);
