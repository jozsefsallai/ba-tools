import { Index } from "@upstash/vector";
import type { StoryRecord, StoryRecordMetadata } from "./story-chunks";

const DEFAULT_NAMESPACE = "stories-v1";
const UPSERT_BATCH_SIZE = 200;
const DELETE_BATCH_SIZE = 500;
const RANGE_PAGE_SIZE = 1000;

export function getStoryIndex() {
  return new Index<StoryRecordMetadata>({
    url: process.env.UPSTASH_VECTOR_REST_URL,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN,
  }).namespace(process.env.STORY_INDEX_NAMESPACE ?? DEFAULT_NAMESPACE);
}

export type SyncStoryIndexResult = {
  total: number;
  upserted: number;
  deleted: number;
  unchanged: number;
};

export type SyncStoryIndexOptions = {
  dryRun?: boolean;
  storyTypes?: StoryRecordMetadata["type"][];
  onProgress?: (message: string) => void;
};

async function readExistingHashes(index: ReturnType<typeof getStoryIndex>) {
  const existing = new Map<string, StoryRecordMetadata>();

  let cursor: string | number = "0";

  while (true) {
    const page: Awaited<ReturnType<typeof index.range<StoryRecordMetadata>>> =
      await index.range<StoryRecordMetadata>({
        cursor,
        limit: RANGE_PAGE_SIZE,
        includeMetadata: true,
      });

    for (const vector of page.vectors) {
      if (vector.metadata) {
        existing.set(String(vector.id), vector.metadata);
      }
    }

    if (!page.nextCursor || page.nextCursor === "0") {
      return existing;
    }

    cursor = page.nextCursor;
  }
}

export async function syncStoryIndex(
  records: StoryRecord[],
  options: SyncStoryIndexOptions = {},
): Promise<SyncStoryIndexResult> {
  const { dryRun = false, storyTypes, onProgress } = options;

  const index = getStoryIndex();

  const existing = await readExistingHashes(index);

  const changed = records.filter(
    (record) => existing.get(record.id)?.hash !== record.metadata.hash,
  );

  const ids = new Set(records.map((record) => record.id));

  const stale = [
    ...existing,
  ]
    .filter(
      ([id, metadata]) =>
        !ids.has(id) && (!storyTypes || storyTypes.includes(metadata.type)),
    )
    .map(([id]) => id);

  const result = {
    total: records.length,
    upserted: changed.length,
    deleted: stale.length,
    unchanged: records.length - changed.length,
  };

  if (dryRun) {
    return result;
  }

  for (let i = 0; i < changed.length; i += UPSERT_BATCH_SIZE) {
    await index.upsert(
      changed.slice(i, i + UPSERT_BATCH_SIZE).map((record) => ({
        id: record.id,
        data: record.data,
        metadata: record.metadata,
      })),
    );

    onProgress?.(
      `Upserted ${Math.min(i + UPSERT_BATCH_SIZE, changed.length)}/${changed.length}`,
    );
  }

  for (let i = 0; i < stale.length; i += DELETE_BATCH_SIZE) {
    await index.delete(stale.slice(i, i + DELETE_BATCH_SIZE));
  }

  return result;
}
