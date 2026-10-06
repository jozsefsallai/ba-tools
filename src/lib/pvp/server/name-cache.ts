import { createHmac, timingSafeEqual } from "node:crypto";
import {
  NAME_FINGERPRINT_VERSION,
  NAME_MASK_HEIGHT,
  NAME_MASK_MAX_WIDTH,
  type NameDescriptor,
  decodeNameMask,
  nameBuckets,
  verifyNameSimilarity,
} from "@/lib/pvp/server/name-fingerprint";
import { createClient } from "redis";
import { z } from "zod";

const descriptorSchema = z
  .object({
    version: z.literal(NAME_FINGERPRINT_VERSION),
    hash: z.string().regex(/^[a-f0-9]{64}$/),
    width: z.number().int().min(1).max(NAME_MASK_MAX_WIDTH),
    height: z.literal(NAME_MASK_HEIGHT),
    mask: z.string().max(49152),
    perceptual: z.string().regex(/^[a-f0-9]{32}$/),
    levelRemoved: z.boolean(),
    reliable: z.boolean(),
  })
  .refine((d) => {
    try {
      return decodeNameMask(d).length === d.width * d.height;
    } catch {
      return false;
    }
  });

const entrySchema = z.object({
  name: z.string().min(1).max(512),
  descriptor: descriptorSchema,
});

const variantSchema = z.object({
  canonicalHash: z.string().regex(/^[a-f0-9]{64}$/),
  descriptor: descriptorSchema,
});

const storedSchema = z.union([entrySchema, variantSchema]);

const receiptSchema = z.object({
  userId: z.string(),
  expires: z.number(),
  descriptor: descriptorSchema,
  matched: entrySchema.optional(),
});

export const nameCacheKey = (hash: string) => `pvp_ocr_${hash}`;

async function connectNameRedis() {
  if (!process.env.REDIS_URL) {
    throw new Error("Redis unavailable");
  }

  const client = createClient({
    url: process.env.REDIS_URL,
    disableOfflineQueue: true,
    socket: { connectTimeout: 1500, reconnectStrategy: false },
  });

  client.on("error", () => {});

  client.on("end", () => {
    connection = undefined;
  });

  await client.connect();

  return client;
}

let connection: ReturnType<typeof connectNameRedis> | undefined;

export function getNameRedis() {
  connection ??= connectNameRedis().catch((error) => {
    connection = undefined;
    throw error;
  });

  return connection;
}

export async function lookupName(descriptor: NameDescriptor) {
  if (!descriptor.reliable) {
    return {
      match: "miss" as const,
      candidates: 0,
    };
  }

  const redis = (await getNameRedis()).withAbortSignal(
    AbortSignal.timeout(1500),
  );

  const resolveEntry = async (value: string | null) => {
    let stored: z.infer<typeof storedSchema> | undefined;

    try {
      const parsed = storedSchema.safeParse(JSON.parse(value ?? "null"));

      if (parsed.success) {
        stored = parsed.data;
      }
    } catch {
      return undefined;
    }

    if (!stored) {
      return undefined;
    }

    if ("name" in stored) {
      return stored;
    }

    const canonical = entrySchema.safeParse(
      JSON.parse(
        (await redis.get(nameCacheKey(stored.canonicalHash))) ?? "null",
      ),
    );

    return canonical.success &&
      canonical.data.descriptor.hash === stored.canonicalHash
      ? canonical.data
      : undefined;
  };

  const exact = await resolveEntry(
    await redis.get(nameCacheKey(descriptor.hash)),
  );

  if (
    exact &&
    (exact.descriptor.hash === descriptor.hash ||
      verifyNameSimilarity(descriptor, exact.descriptor))
  ) {
    return { entry: exact, match: "exact" as const, candidates: 1 };
  }

  const buckets = await Promise.all(
    nameBuckets(descriptor).map((key) => redis.zRange(key, -65, -1)),
  );

  const hashes = [...new Set(buckets.flat())];

  if (buckets.some((b) => b.length > 64) || hashes.length > 128) {
    return { match: "ambiguous" as const, candidates: hashes.length };
  }

  if (!hashes.length) {
    return { match: "miss" as const, candidates: 0 };
  }

  const values = await redis.mGet(hashes.map(nameCacheKey));

  const parsed = values.flatMap((value) => {
    try {
      const stored = storedSchema.safeParse(JSON.parse(value ?? "null"));

      return stored.success &&
        verifyNameSimilarity(descriptor, stored.data.descriptor)
        ? [stored.data]
        : [];
    } catch {
      return [];
    }
  });

  const canonicalHashes = [
    ...new Set(
      parsed.flatMap((stored) =>
        "canonicalHash" in stored ? [stored.canonicalHash] : [],
      ),
    ),
  ];

  const canonicalValues = canonicalHashes.length
    ? await redis.mGet(canonicalHashes.map(nameCacheKey))
    : [];

  const canonical = new Map(
    canonicalHashes.map((hash, index) => [hash, canonicalValues[index]]),
  );

  const matches = parsed.flatMap((stored) => {
    if ("name" in stored) {
      return [stored];
    }

    try {
      const entry = entrySchema.safeParse(
        JSON.parse(canonical.get(stored.canonicalHash) ?? "null"),
      );

      return entry.success &&
        entry.data.descriptor.hash === stored.canonicalHash &&
        verifyNameSimilarity(descriptor, entry.data.descriptor)
        ? [entry.data]
        : [];
    } catch {
      return [];
    }
  });

  if (new Set(matches.map((entry) => entry.name)).size > 1) {
    return { match: "ambiguous" as const, candidates: hashes.length };
  }

  return {
    entry: matches[0],
    match: matches.length ? ("similar" as const) : ("miss" as const),
    candidates: hashes.length,
  };
}

function sign(payload: string) {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("Receipt signing unavailable");
  }

  return createHmac("sha256", process.env.CLERK_SECRET_KEY)
    .update("pvp-opponent-name-receipt-v1\0")
    .update(payload)
    .digest();
}

export function createNameReceipt(
  userId: string,
  descriptor: NameDescriptor,
  matched?: z.infer<typeof entrySchema>,
) {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      descriptor,
      matched,
      expires: Date.now() + 86400000,
    }),
  ).toString("base64url");

  return `${payload}.${sign(payload).toString("base64url")}`;
}

export function readNameReceipt(receipt: string, userId: string) {
  const [payload, signature, extra] = receipt.split(".");

  if (!payload || !signature || extra) {
    throw new Error("Invalid import receipt");
  }

  const expected = sign(payload);

  const actual = Buffer.from(signature, "base64url");

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error("Invalid import receipt");
  }

  const data = receiptSchema.parse(
    JSON.parse(Buffer.from(payload, "base64url").toString()),
  );

  if (data.userId !== userId || data.expires < Date.now()) {
    throw new Error("Expired import receipt");
  }

  return data;
}

export async function saveNameReceipt(
  receipt: string,
  userId: string,
  name: string,
) {
  const data = readNameReceipt(receipt, userId);

  if (!name.trim()) {
    return;
  }

  if (name.length > 512) {
    throw new Error("Name too long");
  }

  const redis = (await getNameRedis()).withAbortSignal(
    AbortSignal.timeout(1500),
  );

  const canonical = data.matched?.descriptor ?? data.descriptor;

  const transaction = redis.multi();

  transaction.set(
    nameCacheKey(canonical.hash),
    JSON.stringify({ name, descriptor: canonical }),
  );

  if (canonical.hash !== data.descriptor.hash) {
    transaction.set(
      nameCacheKey(data.descriptor.hash),
      JSON.stringify({
        canonicalHash: canonical.hash,
        descriptor: data.descriptor,
      }),
    );
  }

  for (const descriptor of [canonical, data.descriptor]) {
    if (descriptor.reliable)
      for (const key of nameBuckets(descriptor)) {
        transaction.zAdd(key, { score: Date.now(), value: descriptor.hash });
      }
  }

  await transaction.exec();
}
