import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

import type { ExtractedImage, SyncLogger } from "./contract";

const CONCURRENCY = 8;
const PROGRESS_EVERY = 100;

// Not `immutable` - existing paths may be overwritten when an asset changes
const CACHE_CONTROL = "public, max-age=86400";

// Manifests list the files next to them, so they should pick up changes quickly
const MANIFEST_CACHE_CONTROL = "public, max-age=300";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  webp: "image/webp",
  json: "application/json",
  atlas: "text/plain; charset=utf-8",
  skel: "application/octet-stream",
};

function contentType(key: string) {
  const type = CONTENT_TYPES[key.split(".").pop()?.toLowerCase() ?? ""];

  if (!type) {
    throw new Error(`No content type for ${key}`);
  }

  return type;
}

function required(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to upload images`);
  }

  return value;
}

function createClient() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export function createPublishedReader(): (
  key: string,
) => Promise<string | null> {
  if (process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET_NAME) {
    const bucket = required("R2_BUCKET_NAME");
    const client = createClient();

    return async (key) => {
      try {
        const object = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          }),
        );

        return (await object.Body?.transformToString("utf-8")) ?? null;
      } catch (err) {
        if (
          err instanceof S3ServiceException &&
          err.$metadata.httpStatusCode === 404
        ) {
          return null;
        }

        throw err;
      }
    };
  }

  const base = process.env.NEXT_PUBLIC_IMAGE_CDN_URL?.replace(/\/+$/, "");

  if (!base) {
    throw new Error(
      "R2 credentials or NEXT_PUBLIC_IMAGE_CDN_URL are needed to read published files",
    );
  }

  const startedAt = Date.now();

  return async (key) => {
    const res = await fetch(`${base}/${key}?t=${startedAt}`, {
      cache: "no-store",
    });

    if (res.status === 404 || res.status === 403) {
      return null;
    }

    if (!res.ok) {
      throw new Error(`Failed to read ${key}: ${res.status}`);
    }

    return res.text();
  };
}

export interface UploadImagesResult {
  uploaded: string[];
  unchanged: string[];
}

export async function uploadImages(
  files: ExtractedImage[],
  {
    overwrite,
    logger,
  }: {
    overwrite: boolean;
    logger?: Pick<SyncLogger, "info">;
  },
): Promise<UploadImagesResult> {
  const bucket = required("R2_BUCKET_NAME");

  const client = createClient();

  const result: UploadImagesResult = {
    uploaded: [],
    unchanged: [],
  };

  async function uploadOne(file: ExtractedImage) {
    const body = await readFile(file.path);
    const md5 = createHash("md5").update(body).digest("hex");

    try {
      const head = await client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: file.key,
        }),
      );

      if (!overwrite || head.ETag?.replaceAll('"', "") === md5) {
        result.unchanged.push(file.key);
        return;
      }
    } catch (err) {
      if (
        !(err instanceof S3ServiceException) ||
        err.$metadata.httpStatusCode !== 404
      ) {
        throw err;
      }
    }

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: file.key,
        Body: body,
        ContentType: contentType(file.key),
        CacheControl: file.key.endsWith("/manifest.json")
          ? MANIFEST_CACHE_CONTROL
          : CACHE_CONTROL,
      }),
    );

    result.uploaded.push(file.key);
  }

  const queue = [
    ...files,
  ];
  let done = 0;

  const logProgress = () =>
    logger?.info(
      `Upload: ${done}/${files.length} files (${result.uploaded.length} uploaded, ${result.unchanged.length} unchanged)`,
    );

  await Promise.all(
    Array.from(
      {
        length: CONCURRENCY,
      },
      async () => {
        for (let file = queue.shift(); file; file = queue.shift()) {
          await uploadOne(file);

          if (++done % PROGRESS_EVERY === 0 && done < files.length) {
            logProgress();
          }
        }
      },
    ),
  );

  logProgress();

  result.uploaded.sort();
  result.unchanged.sort();

  return result;
}
