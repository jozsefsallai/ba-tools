import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

import { getExistingStudents } from "@/lib/game-data/existing-students.server";
import {
  cacheDir,
  loadMxDataSync,
  logger,
  parseSqlcipherKey,
} from "./lib/mx-data-sync";

const { values } = parseArgs({
  options: {
    "sqlcipher-key": { type: "string" },
    out: { type: "string" },
  },
});

const sqlcipherKey = parseSqlcipherKey(values["sqlcipher-key"]);
const { listNewStudents } = await loadMxDataSync();

const result = await listNewStudents({
  sqlcipherKey,
  existing: await getExistingStudents(),
  cacheDir,
  logger,
});

const json = `${JSON.stringify(result.students, null, 2)}\n`;

if (values.out) {
  await mkdir(dirname(values.out), { recursive: true });
  await writeFile(values.out, json);
  logger.info(`Wrote ${result.students.length} students to ${values.out}`);
} else {
  process.stdout.write(json);
}

process.exit(0);
