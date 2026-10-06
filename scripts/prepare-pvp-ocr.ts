import {
  copyFile,
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import {
  PVP_OCR_CORE_VARIANTS,
  getPvpOcrAssetBaseUrl,
} from "@/lib/pvp/ocr-asset-url";
import config from "@/lib/pvp/ocr-assets.json";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const runtime = dirname(require.resolve("tesseract.js/package.json"));
const core = dirname(
  createRequire(join(runtime, "package.json")).resolve(
    "tesseract.js-core/package.json",
  ),
);

for (const directory of [runtime, core]) {
  const { version } = JSON.parse(
    await readFile(join(directory, "package.json"), "utf8"),
  );

  if (version !== config.runtimeVersion) {
    throw new Error(
      `Update the OCR asset version before using runtime ${version}`,
    );
  }
}

const assetUrl = getPvpOcrAssetBaseUrl();
const target = join(root, ".cache/pvp-ocr/v2/ocr", config.version);

const existingManifest = await readFile(join(target, "manifest.json"), "utf8")
  .then((text) => JSON.parse(text))
  .catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  });

if (
  existingManifest &&
  JSON.stringify(existingManifest) !== JSON.stringify(config)
) {
  throw new Error(
    "OCR asset configuration changed; use a new version directory",
  );
}

await mkdir(join(target, "core"), { recursive: true });
await mkdir(join(target, "lang"), { recursive: true });
await copyFile(
  join(runtime, "dist/worker.min.js"),
  join(target, "worker.min.js"),
);
await copyFile(join(runtime, "LICENSE.md"), join(target, "TESSERACT-LICENSE"));
await copyFile(
  join(runtime, "dist/worker.min.js.LICENSE.txt"),
  join(target, "worker.min.js.LICENSE.txt"),
);
await copyFile(join(core, "LICENSE"), join(target, "CORE-LICENSE"));

for (const suffix of PVP_OCR_CORE_VARIANTS) {
  for (const extension of ["wasm", "wasm.js"]) {
    const filename = `tesseract-core-${suffix}.${extension}`;
    await copyFile(join(core, filename), join(target, "core", filename));
  }
}

await Promise.all(
  config.languages.map(async (language) => {
    const filename = join(target, "lang", `${language}.traineddata.gz`);

    if (
      await stat(filename)
        .then((s) => s.size > 0)
        .catch(() => false)
    ) {
      return;
    }

    const url = `https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/${config.languageRevision}/${language}.traineddata`;
    const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });

    if (!response.ok) {
      throw new Error(
        `Unable to download ${language}: HTTP ${response.status}`,
      );
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(`${filename}.tmp`, gzipSync(bytes, { level: 9 }));
    await rename(`${filename}.tmp`, filename);

    console.log(
      `Prepared ${language} OCR data (${(bytes.length / 1024 / 1024).toFixed(1)} MiB uncompressed)`,
    );
  }),
);

await writeFile(
  join(target, "manifest.json"),
  `${JSON.stringify(config, null, 2)}\n`,
);

console.log(`PvP OCR assets ready: ${target}`);
console.log(`Upload this directory to ${assetUrl.href}`);
