// Resolved by the esbuild plugin in trigger.config.ts to the private submodule, or to a stub.
declare module "mx-data-sync:entry" {
  export const listNewStudents:
    | import("@/lib/game-data/contract").DataSyncModule["listNewStudents"]
    | undefined;

  export const listFavorItems:
    | import("@/lib/game-data/contract").DataSyncModule["listFavorItems"]
    | undefined;

  export const extractImageAssets:
    | import("@/lib/game-data/contract").DataSyncModule["extractImageAssets"]
    | undefined;

  export const extractBondStories:
    | import("@/lib/game-data/contract").DataSyncModule["extractBondStories"]
    | undefined;

  export const extractGameItems:
    | import("@/lib/game-data/contract").DataSyncModule["extractGameItems"]
    | undefined;

  export const extractMissions:
    | import("@/lib/game-data/contract").DataSyncModule["extractMissions"]
    | undefined;

  export const extractStories:
    | import("@/lib/game-data/contract").DataSyncModule["extractStories"]
    | undefined;

  export const extractStudentSkills:
    | import("@/lib/game-data/contract").DataSyncModule["extractStudentSkills"]
    | undefined;

  export const extractUpcomingContent:
    | import("@/lib/game-data/contract").DataSyncModule["extractUpcomingContent"]
    | undefined;

  export const getJpMaintenance:
    | import("@/lib/game-data/contract").DataSyncModule["getJpMaintenance"]
    | undefined;
}
