// Resolved by the esbuild plugin in trigger.config.ts to the private submodule, or to a stub.
declare module "mx-data-sync:entry" {
  export const listNewStudents:
    | import("@/lib/game-data/contract").DataSyncModule["listNewStudents"]
    | undefined;

  export const extractImageAssets:
    | import("@/lib/game-data/contract").DataSyncModule["extractImageAssets"]
    | undefined;
}
