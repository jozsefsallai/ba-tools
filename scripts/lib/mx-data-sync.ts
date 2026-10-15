import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { DataSyncModule, SyncLogger } from "@/lib/game-data/contract";

const root = fileURLToPath(new URL("../../", import.meta.url));
const entry = `${root}private/mx-data-sync/src/index.ts`;

export const cacheDir = `${root}.cache/game-data/downloads`;

export const logger: SyncLogger = {
  info: (message) => console.error(message),
  warn: (message) => console.error(`warn: ${message}`),
  error: (message) => console.error(`error: ${message}`),
};

export async function loadMxDataSync(): Promise<DataSyncModule> {
  if (!existsSync(entry)) {
    console.error(
      "The private mx-data-sync submodule is not available (see AGENTS.md).",
    );
    process.exit(1);
  }

  return (await import(pathToFileURL(entry).href)) as DataSyncModule;
}

export function parseSqlcipherKey(value: string | undefined) {
  if (value !== undefined && !/^[0-9a-fA-F]{64}$/.test(value)) {
    console.error("--sqlcipher-key must be 64 hex characters.");
    process.exit(1);
  }

  return value;
}
