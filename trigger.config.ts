import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { esbuildPlugin } from "@trigger.dev/build/extensions";
import { additionalPackages } from "@trigger.dev/build/extensions/core";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { defineConfig } from "@trigger.dev/sdk/v3";

// The mx-data-sync submodule is optional. Without it, certain tasks get a stub
// and abort
const mxDataSyncEntry = resolve("private/mx-data-sync/src/index.ts");
const mxDataSyncStub = resolve("src/trigger/lib/mx-data-sync-stub.ts");

// Some of mx-asset-sync's runtime dependencies ship WASM, which can't be
// bundled, so they are installed in the deployed image at the versions the
// submodule pins
const mxDataSyncPackages = existsSync(mxDataSyncEntry)
  ? Object.entries(
      (
        JSON.parse(
          readFileSync(resolve("private/mx-data-sync/package.json"), "utf8"),
        ) as { dependencies?: Record<string, string> }
      ).dependencies ?? {},
    ).map(([name, version]) => `${name}@${version}`)
  : [];

export default defineConfig({
  project: "proj_kziwfrqkxqojvirsmuio",
  runtime: "node-22",
  logLevel: "log",
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
  build: {
    extensions: [
      prismaExtension({
        mode: "modern",
      }),
      ...(mxDataSyncPackages.length > 0
        ? [additionalPackages({ packages: mxDataSyncPackages })]
        : []),
      esbuildPlugin({
        name: "mx-data-sync",
        setup(build) {
          build.onResolve({ filter: /^mx-data-sync:entry$/ }, () => ({
            path: existsSync(mxDataSyncEntry)
              ? mxDataSyncEntry
              : mxDataSyncStub,
          }));
        },
      }),
    ],
  },
});
