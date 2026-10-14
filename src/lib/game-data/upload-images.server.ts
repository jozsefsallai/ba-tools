import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

import type { ExtractedImage, SyncLogger } from "./contract";

const CONCURRENCY = 8;
// Not `immutable` - existing paths may be overwritten when an asset changes
const CACHE_CONTROL = "public, max-age=86400";

function required(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to upload images`);
  }

  return value;
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
  }: { overwrite: boolean; logger?: Pick<SyncLogger, "info"> },
): Promise<UploadImagesResult> {
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

  const result: UploadImagesResult = { uploaded: [], unchanged: [] };

  async function uploadOne(file: ExtractedImage) {
    const body = await readFile(file.path);
    const md5 = createHash("md5").update(body).digest("hex");

    try {
      const head = await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: file.key }),
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
        ContentType: "image/png",
        CacheControl: CACHE_CONTROL,
      }),
    );

    result.uploaded.push(file.key);
    logger?.info(`Uploaded ${file.key}`);
  }

  const queue = [...files];

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let file = queue.shift(); file; file = queue.shift()) {
        await uploadOne(file);
      }
    }),
  );

  result.uploaded.sort();
  result.unchanged.sort();

  return result;
}
