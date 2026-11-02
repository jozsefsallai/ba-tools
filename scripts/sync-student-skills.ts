import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

import { localizeTable } from "@/lib/aronabot-localize-table";
import {
  resolveSkillStudents,
  saveStudentSkills,
} from "@/lib/game-data/student-skills.server";
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
    "dev-names": {
      type: "string",
    },
    out: {
      type: "string",
    },
  },
});

const sqlcipherKey = parseSqlcipherKey(values["sqlcipher-key"]);
const globalSqlcipherKey = parseSqlcipherKey(values["global-sqlcipher-key"]);

const devNames = (values["dev-names"] ?? "")
  .split(",")
  .map((n) => n.trim())
  .filter(Boolean);

const { extractStudentSkills } = await loadMxDataSync();

const result = await extractStudentSkills({
  sqlcipherKey,
  globalSqlcipherKey,
  students: await resolveSkillStudents(devNames),
  cacheDir,
  logger,
  effectNames: {
    en: localizeTable.EN.buffName,
  },
});

if (values.out) {
  await mkdir(dirname(values.out), {
    recursive: true,
  });
  await writeFile(values.out, `${JSON.stringify(result, null, 2)}\n`);
  logger.info(`Wrote ${result.skills.length} skills to ${values.out}`);
} else {
  const saved = await saveStudentSkills(result);
  console.log(
    JSON.stringify(
      {
        gameVersion: result.gameVersion,
        ...saved,
        missing: result.missing,
        warnings: result.warnings,
      },
      null,
      2,
    ),
  );
}

process.exit(0);
