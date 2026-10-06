import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PVP_ICON_CATALOG_FORMAT,
  PVP_ICON_TEMPLATE_BYTES,
  type PvpIconCatalog,
} from "@/lib/pvp/icon-match";
import {
  getPvpIconAssetBaseUrl,
  getPvpOcrAssetBaseUrl,
  getPvpOcrAssetFilenames,
} from "@/lib/pvp/ocr-asset-url";
import config from "@/lib/pvp/ocr-assets.json";
import {
  type CORSRule,
  GetBucketCorsCommand,
  HeadObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

function required(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for OCR asset uploads`);
  }

  return value;
}

const bucket = required("R2_BUCKET_NAME");

const client = new S3Client({
  region: "auto",
  endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: required("R2_ACCESS_KEY_ID"),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const root = fileURLToPath(new URL("../", import.meta.url));
const assetUrl = getPvpOcrAssetBaseUrl();
const directory = join(root, ".cache/pvp-ocr/v2/ocr", config.version);
const cacheControl = "public, max-age=31536000, immutable";

function contentType(filename: string) {
  if (filename.endsWith(".js")) {
    return "application/javascript";
  }

  if (filename.endsWith(".wasm")) {
    return "application/wasm";
  }

  if (filename.endsWith(".json")) {
    return "application/json";
  }

  if (filename.endsWith(".gz") || filename.endsWith(".bin")) {
    return "application/octet-stream";
  }

  return "text/plain; charset=utf-8";
}

try {
  const manifest = JSON.parse(
    await readFile(join(directory, "manifest.json"), "utf8"),
  );

  if (JSON.stringify(manifest) !== JSON.stringify(config)) {
    throw new Error("OCR export is outdated; run pnpm run ocr:assets first");
  }

  const filenames = getPvpOcrAssetFilenames().sort((a, b) => {
    // Publish the manifest only after all runtime/language files are uploaded
    if (a === "manifest.json") {
      return 1;
    }

    if (b === "manifest.json") {
      return -1;
    }

    return a.localeCompare(b);
  });

  // Require a complete export before contacting R2
  const bodies = await Promise.all(
    filenames.map((filename) => readFile(join(directory, filename))),
  );

  const iconDirectory = join(root, ".cache/pvp-ocr/v2/ocr/pvp-icons");
  const iconManifest = await readFile(join(iconDirectory, "manifest.json"));
  const catalog: PvpIconCatalog = JSON.parse(iconManifest.toString());

  if (
    catalog.format !== PVP_ICON_CATALOG_FORMAT ||
    !Array.isArray(catalog.students) ||
    !/^[a-f0-9]{16}\.bin$/.test(catalog.asset)
  ) {
    throw new Error("Invalid student icon export; run pnpm run ocr:assets");
  }

  const templates = await readFile(join(iconDirectory, catalog.asset));

  const iconVersion = createHash("sha256")
    .update(JSON.stringify(catalog.students))
    .update(templates)
    .digest("hex")
    .slice(0, 16);

  if (
    templates.length !== catalog.students.length * PVP_ICON_TEMPLATE_BYTES ||
    catalog.asset !== `${iconVersion}.bin`
  ) {
    throw new Error("Student icon export is incomplete or has an invalid hash");
  }

  const uploadFiles = [
    ...filenames.map((filename, index) => ({
      filename,
      key: `v2/ocr/${config.version}/${filename}`,
      body: bodies[index],
    })),
    {
      filename: catalog.asset,
      key: `v2/ocr/pvp-icons/${catalog.asset}`,
      body: templates,
    },
    // Every build pins this immutable catalog, published after its binary
    {
      filename: `${iconVersion}.json`,
      key: `v2/ocr/pvp-icons/${iconVersion}.json`,
      body: iconManifest,
    },
  ];

  // Preflight the whole version before writing anything. Never replace an
  // immutable URL's contents, even on a retry after a partial upload
  const uploads: ((typeof uploadFiles)[number] & {
    md5: Buffer;
  })[] = [];

  for (const file of uploadFiles) {
    const { filename, key, body } = file;
    const md5 = createHash("md5").update(body).digest();

    try {
      const existing = await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );

      const identical =
        existing.ETag === `"${md5.toString("hex")}"` &&
        existing.CacheControl === cacheControl &&
        existing.ContentType === contentType(filename) &&
        !existing.ContentEncoding;

      if (identical) {
        console.log(`Already uploaded: ${key}`);
      } else {
        throw new Error(
          `Refusing to change immutable asset ${key}; publish a new asset version`,
        );
      }
    } catch (error) {
      if (
        !(error instanceof S3ServiceException) ||
        error.$metadata.httpStatusCode !== 404
      ) {
        throw error;
      }

      uploads.push({ ...file, md5 });
    }
  }

  if (process.argv.includes("--configure-cors")) {
    let rules: CORSRule[] = [];

    try {
      const existing = await client.send(
        new GetBucketCorsCommand({ Bucket: bucket }),
      );

      rules = existing.CORSRules ?? [];
    } catch (error) {
      if (
        !(error instanceof S3ServiceException) ||
        error.name !== "NoSuchCORSConfiguration"
      ) {
        throw error;
      }
    }

    const id = "pvp-ocr-assets";

    await client.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [
            ...rules.filter((rule) => rule.ID !== id),
            {
              ID: id,
              AllowedOrigins: ["*"],
              AllowedMethods: ["GET", "HEAD"],
              MaxAgeSeconds: 86400,
            },
          ],
        },
      }),
    );

    console.log("Configured OCR CORS rule; preserved other bucket rules");
  }

  for (const file of uploads) {
    const { filename, key, body, md5 } = file;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType(filename),
        ContentMD5: md5.toString("base64"),
        CacheControl: cacheControl,
        IfNoneMatch: "*",
      }),
    );

    console.log(`Uploaded: ${key}`);
  }

  console.log(`OCR assets published at ${assetUrl.href}`);
  console.log(
    `Student icon assets published at ${getPvpIconAssetBaseUrl().href}`,
  );
} finally {
  client.destroy();
}
