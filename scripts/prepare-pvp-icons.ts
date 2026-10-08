import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { db } from "@/lib/db";
import {
  PVP_ICON_CATALOG_FORMAT,
  PVP_ICON_TEMPLATE_BYTES,
  type PvpIconCatalog,
} from "@/lib/pvp/icon-match";
import {
  describePvpIconReference,
  pvpIconDescriptorCacheKey,
} from "@/lib/pvp/server/icon-reference";
import { buildStudentIconUrlFromId } from "@/lib/url";

const root = fileURLToPath(new URL("../", import.meta.url));

const target = `${root}.cache/pvp-ocr/v2/ocr/pvp-icons`;
const cache = `${root}.cache/pvp-icons-v2`;

const background = await readFile(`${root}src/assets/images/char-bg.png`);

const refresh = Date.now().toString();
const base = process.env.NEXT_PUBLIC_IMAGE_CDN_URL;

if (!base) {
  throw new Error("NEXT_PUBLIC_IMAGE_CDN_URL is required for icon assets");
}

await Promise.all([
  mkdir(target, { recursive: true }),
  mkdir(cache, { recursive: true }),
]);

try {
  const students = await db.student.findMany({
    select: { id: true, name: true },
    orderBy: [{ defaultOrder: "asc" }, { id: "asc" }],
  });

  const descriptors = new Uint8Array(students.length * PVP_ICON_TEMPLATE_BYTES);

  let next = 0;

  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (;;) {
        const index = next++;
        const student = students[index];

        if (!student) {
          return;
        }

        const url = buildStudentIconUrlFromId(encodeURIComponent(student.id));
        const key = pvpIconDescriptorCacheKey(url, background);
        const path = `${cache}/${key}.json`;

        const cachedValue: { etag?: string; descriptor: number[] } | null =
          await readFile(path, "utf8")
            .then(JSON.parse)
            .catch(() => null);

        const cached =
          cachedValue?.descriptor?.length === PVP_ICON_TEMPLATE_BYTES
            ? cachedValue
            : null;

        const freshUrl = new URL(url);
        freshUrl.searchParams.set("pvp-icon-refresh", refresh);

        const response = await fetch(freshUrl, {
          headers: cached?.etag ? { "If-None-Match": cached.etag } : {},
          signal: AbortSignal.timeout(60_000),
        });

        let descriptor: Uint8Array;

        if (
          response.status === 304 &&
          cached &&
          cached.descriptor.length === PVP_ICON_TEMPLATE_BYTES
        ) {
          descriptor = Uint8Array.from(cached.descriptor);
        } else {
          if (!response.ok) {
            throw new Error(
              `Student icon ${student.id}: HTTP ${response.status}`,
            );
          }

          descriptor = describePvpIconReference(
            Buffer.from(await response.arrayBuffer()),
            background,
          );

          await writeFile(
            path,
            JSON.stringify({
              etag: response.headers.get("etag"),
              descriptor: Array.from(descriptor),
            }),
          );
        }

        descriptors.set(descriptor, index * PVP_ICON_TEMPLATE_BYTES);
      }
    }),
  );

  const version = createHash("sha256")
    .update(JSON.stringify(students))
    .update(descriptors)
    .digest("hex")
    .slice(0, 16);

  const asset = `${version}.bin`;
  const temporaryAsset = `${target}/${asset}.${process.pid}.tmp`;
  const temporaryManifest = `${target}/manifest.${process.pid}.tmp`;

  await writeFile(temporaryAsset, descriptors);
  await rename(temporaryAsset, `${target}/${asset}`);

  const manifest: PvpIconCatalog = {
    format: PVP_ICON_CATALOG_FORMAT,
    asset,
    students,
  };
  await writeFile(temporaryManifest, `${JSON.stringify(manifest)}\n`);
  await rename(temporaryManifest, `${target}/manifest.json`);

  console.log(
    `Prepared ${students.length} student icon templates (${descriptors.length} bytes, ${version})`,
  );
} finally {
  await db.$disconnect();
}
