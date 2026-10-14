import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Task, logger, task } from "@trigger.dev/sdk";
import type { NewStudent } from "../lib/game-data/contract";
import { getExistingStudents } from "../lib/game-data/existing-students.server";
import { loadMxDataSync } from "./lib/mx-data-sync";
import { type ListNewStudentsPayload, listNewStudentsPayload } from "./schemas";

export const listNewStudentsTask: Task<
  "list-new-students",
  ListNewStudentsPayload,
  NewStudent[]
> = task({
  id: "list-new-students",
  run: async (payload: ListNewStudentsPayload) => {
    const { sqlcipherKey } = listNewStudentsPayload.parse(payload);
    const { listNewStudents } = await loadMxDataSync();

    const workDir = await mkdtemp(join(tmpdir(), "mx-data-sync-"));

    const result = await listNewStudents({
      sqlcipherKey,
      existing: await getExistingStudents(),
      cacheDir: join(workDir, "cache"),
      logger,
    });

    return result.students;
  },
});
