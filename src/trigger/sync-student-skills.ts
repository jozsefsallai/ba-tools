import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Task, logger, task } from "@trigger.dev/sdk";
import { localizeTable } from "../lib/aronabot-localize-table";
import {
  type SaveStudentSkillsResult,
  resolveSkillStudents,
  saveStudentSkills,
} from "../lib/game-data/student-skills.server";
import { loadMxDataSync } from "./lib/mx-data-sync";
import {
  type SyncStudentSkillsPayload,
  syncStudentSkillsPayload,
} from "./schemas";

export type SyncStudentSkillsResult = {
  gameVersion: { jp: string; global: string | null };
  dryRun: boolean;
  extracted: { effects: number; skills: number };
  saved: SaveStudentSkillsResult | null;
  missing: string[];
  warnings: string[];
};

export const syncStudentSkillsTask: Task<
  "sync-student-skills",
  SyncStudentSkillsPayload,
  SyncStudentSkillsResult
> = task({
  id: "sync-student-skills",
  run: async (payload: SyncStudentSkillsPayload) => {
    const { sqlcipherKey, globalSqlcipherKey, devNames, dryRun } =
      syncStudentSkillsPayload.parse(payload);

    const { extractStudentSkills } = await loadMxDataSync();

    const workDir = await mkdtemp(join(tmpdir(), "mx-data-sync-"));
    const result = await extractStudentSkills({
      sqlcipherKey,
      globalSqlcipherKey,
      students: await resolveSkillStudents(devNames),
      cacheDir: join(workDir, "cache"),
      logger,
      effectNames: { en: localizeTable.EN.buffName },
    });

    return {
      gameVersion: result.gameVersion,
      dryRun,
      extracted: {
        effects: result.effects.length,
        skills: result.skills.length,
      },
      saved: dryRun ? null : await saveStudentSkills(result),
      missing: result.missing,
      warnings: result.warnings,
    };
  },
});
