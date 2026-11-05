import {
  STORY_HEADER_SEPARATOR,
  type StoryRecordMetadata,
} from "@/lib/game-data/story-chunks";
import { getStoryIndex } from "@/lib/game-data/story-index.server";

const SCENE_TOP_K = 20;
const SUMMARY_TOP_K = 10;
const MAX_QUERIES = 3;
const MAX_SUMMARIES = 10;

const MAX_SCENE_HITS = 16;
const EXPANDED_SCENE_HITS = 2;
const PASSAGE_CHAR_BUDGET = 16000;
const SEARCH_TIMEOUT_MS = 5000;

const RRF_K = 60;

const TYPE_WEIGHTS: Record<StoryRecordMetadata["type"], number> = {
  main: 1.15,
  mini: 1,
  group: 1,
  event: 1,
  bond: 1,
};

const TYPE_ORDER: StoryRecordMetadata["type"][] = [
  "main",
  "mini",
  "group",
  "event",
  "bond",
];

export type LoreContext = {
  summaries: string[];
  passages: string[];
};

type SearchRecord = {
  id: string;
  data: string;
  metadata: StoryRecordMetadata;
};

function toRecords(
  results: {
    id: string | number;
    data?: string;
    metadata?: StoryRecordMetadata;
  }[],
): SearchRecord[] {
  return results.flatMap((result) =>
    result.data && result.metadata
      ? [
          {
            id: String(result.id),
            data: result.data,
            metadata: result.metadata,
          },
        ]
      : [],
  );
}

function fuseRanks(rankings: SearchRecord[][]) {
  const scored = new Map<
    string,
    {
      record: SearchRecord;
      score: number;
    }
  >();

  for (const ranking of rankings) {
    ranking.forEach((record, rank) => {
      const entry = scored.get(record.id) ?? {
        record,
        score: 0,
      };

      entry.score += TYPE_WEIGHTS[record.metadata.type] / (RRF_K + rank + 1);
      scored.set(record.id, entry);
    });
  }

  return [
    ...scored.values(),
  ].sort((a, b) => b.score - a.score);
}

function splitRecord(data: string) {
  const end = data.indexOf(STORY_HEADER_SEPARATOR);

  return {
    label: data.slice(0, data.indexOf("\n")),
    body: data.slice(end + STORY_HEADER_SEPARATOR.length),
  };
}

function joinBodies(bodies: string[]) {
  const lines: string[] = [];

  for (const body of bodies) {
    const next = body.split("\n");

    let overlap = 0;

    for (let size = Math.min(next.length, lines.length); size > 0; size--) {
      if (lines.slice(-size).join("\n") === next.slice(0, size).join("\n")) {
        overlap = size;
        break;
      }
    }

    lines.push(...next.slice(overlap));
  }

  return lines.join("\n");
}

function neighbourIds(record: SearchRecord) {
  const { episodeId, chunkIndex } = record.metadata;

  const ids = [
    `${episodeId}:c${chunkIndex + 1}`,
  ];

  if (chunkIndex > 0) {
    ids.push(`${episodeId}:c${chunkIndex - 1}`);
  }

  return ids;
}

type Passage = {
  metadata: StoryRecordMetadata;
  text: string;
  score: number;
};

function buildPassages(
  hits: {
    record: SearchRecord;
    score: number;
  }[],
  neighbours: SearchRecord[],
): Passage[] {
  const scores = new Map(
    hits.map((hit) => [
      hit.record.id,
      hit.score,
    ]),
  );

  const records = new Map(
    [
      ...hits.map((hit) => hit.record),
      ...neighbours,
    ].map((record) => [
      record.id,
      record,
    ]),
  );

  const byEpisode = new Map<string, SearchRecord[]>();

  for (const record of records.values()) {
    const list = byEpisode.get(record.metadata.episodeId) ?? [];
    list.push(record);
    byEpisode.set(record.metadata.episodeId, list);
  }

  const passages: Passage[] = [];

  for (const list of byEpisode.values()) {
    list.sort((a, b) => a.metadata.chunkIndex - b.metadata.chunkIndex);

    let run: SearchRecord[] = [];

    const flush = () => {
      if (run.length === 0) {
        return;
      }

      const label = splitRecord(run[0].data).label;

      passages.push({
        metadata: run[0].metadata,
        text: `${label}\n${joinBodies(run.map((r) => splitRecord(r.data).body))}`,
        score: Math.max(...run.map((r) => scores.get(r.id) ?? 0)),
      });

      run = [];
    };

    for (const record of list) {
      const previous = run.at(-1);

      if (
        previous &&
        record.metadata.chunkIndex !== previous.metadata.chunkIndex + 1
      ) {
        flush();
      }

      run.push(record);
    }

    flush();
  }

  return passages;
}

function selectPassages(passages: Passage[]) {
  const selected: Passage[] = [];

  let used = 0;

  for (const passage of [
    ...passages,
  ].sort((a, b) => b.score - a.score)) {
    if (used + passage.text.length > PASSAGE_CHAR_BUDGET) {
      continue;
    }

    selected.push(passage);
    used += passage.text.length;
  }

  // Reads as the story goes, with the main plot first.
  return selected.sort(
    (a, b) =>
      TYPE_ORDER.indexOf(a.metadata.type) -
        TYPE_ORDER.indexOf(b.metadata.type) ||
      a.metadata.chapterId.localeCompare(b.metadata.chapterId, undefined, {
        numeric: true,
      }) ||
      a.metadata.order - b.metadata.order ||
      a.metadata.chunkIndex - b.metadata.chunkIndex,
  );
}

async function search(queries: string[], now: number): Promise<LoreContext> {
  const index = getStoryIndex();
  const released = `openAt <= ${now}`;

  const run = (data: string, topK: number, kinds: string) =>
    index.query<StoryRecordMetadata>({
      data,
      topK,
      includeData: true,
      includeMetadata: true,
      filter: `kind IN (${kinds}) AND ${released}`,
    });

  const limited = queries.slice(0, MAX_QUERIES);

  const [sceneResults, summaryResults] = await Promise.all([
    Promise.all(limited.map((q) => run(q, SCENE_TOP_K, "'scene'"))),
    Promise.all(
      limited.map((q) =>
        run(q, SUMMARY_TOP_K, "'episodeSummary', 'chapterSummary'"),
      ),
    ),
  ]);

  const sceneRankings = sceneResults.map(toRecords);
  const summaryRankings = summaryResults.map(toRecords);

  const scenes = fuseRanks(sceneRankings).slice(0, MAX_SCENE_HITS);
  const summaries = fuseRanks(summaryRankings).slice(0, MAX_SUMMARIES);

  const known = new Set(scenes.map((scene) => scene.record.id));
  const wanted = [
    ...new Set(
      scenes
        .slice(0, EXPANDED_SCENE_HITS)
        .flatMap((scene) => neighbourIds(scene.record)),
    ),
  ].filter((id) => !known.has(id));

  const fetched =
    wanted.length > 0
      ? await index.fetch(wanted, {
          includeData: true,
          includeMetadata: true,
        })
      : [];

  const neighbours = toRecords(
    fetched.flatMap((record) =>
      record
        ? [
            record,
          ]
        : [],
    ),
  );

  const passages = selectPassages(buildPassages(scenes, neighbours));

  return {
    summaries: summaries.map((summary) => summary.record.data),
    passages: passages.map((passage) => passage.text),
  };
}

/** Throws when Upstash fails or is too slow; chat then answers without lore. */
export async function searchStories(
  queries: string[],
  now = Date.now(),
): Promise<LoreContext> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      search(queries, now),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Story search timed out")),
          SEARCH_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
