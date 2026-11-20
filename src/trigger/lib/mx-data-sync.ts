import { AbortTaskRunError } from "@trigger.dev/sdk";
import type { DataSyncModule } from "../../lib/game-data/contract";

// Loads the mx-data-sync module, ending the run with an error when it isn't
// bundled.
export async function loadMxDataSync(): Promise<DataSyncModule> {
  const {
    listNewStudents,
    listFavorItems,
    extractImageAssets,
    extractStudentSkills,
    extractBondStories,
    extractStories,
    extractUpcomingContent,
    extractMissions,
    getJpMaintenance,
  } = await import("mx-data-sync:entry");

  if (
    !listNewStudents ||
    !listFavorItems ||
    !extractImageAssets ||
    !extractStudentSkills ||
    !extractBondStories ||
    !extractStories ||
    !extractUpcomingContent ||
    !extractMissions ||
    !getJpMaintenance
  ) {
    throw new AbortTaskRunError(
      "mx-data-sync is not bundled with this deployment (private submodule missing).",
    );
  }

  return {
    listNewStudents,
    listFavorItems,
    extractImageAssets,
    extractStudentSkills,
    extractBondStories,
    extractStories,
    extractUpcomingContent,
    extractMissions,
    getJpMaintenance,
  };
}
