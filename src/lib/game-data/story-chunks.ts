import { createHash } from "node:crypto";
import type { StoryEpisode, StoryLine, StoryType } from "./contract";

export const STORY_PIPELINE_VERSION = 1;

const TARGET_CHARS = 1500;
const MIN_CHARS = 400;
const OVERLAP_LINES = 2;
const MAX_CHAPTER_SUMMARY_CHARS = 8000;
const MAX_LISTED_SPEAKERS = 12;

export const STORY_HEADER_SEPARATOR = "\n\n";

export type StoryRecordKind = "scene" | "episodeSummary" | "chapterSummary";

export type StoryRecordMetadata = {
  kind: StoryRecordKind;
  type: StoryType;
  chapterId: string;
  episodeId: string;
  order: number;
  chunkIndex: number;
  speakers: string[];
  /** Milliseconds, 0 for stories without a release date. */
  openAt: number;
  hash: string;
};

export type StoryRecord = {
  id: string;
  data: string;
  metadata: StoryRecordMetadata;
};

const TYPE_LABELS: Record<StoryType, string> = {
  main: "Main Story",
  group: "Group Story",
  mini: "Mini Story",
  event: "Event Story",
  bond: "Bond Story",
};

function typeLabel(episode: StoryEpisode) {
  return episode.chapterId.startsWith("specialop:")
    ? "Special Operation"
    : TYPE_LABELS[episode.type];
}

function storyPath(episode: StoryEpisode, withEpisode: boolean) {
  const parts = [
    typeLabel(episode),
    episode.volumeTitle,
    episode.chapterTitle,
    episode.branchEventTitle,
  ];

  if (withEpisode) {
    parts.push(episode.title);
  }

  // Prologue's volume and chapter share a title.
  return parts.filter((part, i) => part && parts.indexOf(part) === i);
}

export function formatStoryLine(line: StoryLine): string {
  if (line.kind === "sensei" || line.kind === "choice") {
    return line.kind === "sensei"
      ? `Sensei: ${line.text}`
      : `Sensei (choice ${line.option}): ${line.text}`;
  }

  const reply = line.selectionGroup
    ? `(after choice ${line.selectionGroup}) `
    : "";

  if (line.kind === "dialogue") {
    const speaker = line.speaker ?? "Unknown";

    const name = line.affiliation
      ? `${speaker} (${line.affiliation})`
      : speaker;

    return `${reply}${name}: ${line.text}`;
  }

  if (line.kind === "caption") {
    return `${reply}[${line.text}]`;
  }

  return `${reply}${line.text.startsWith("(") ? line.text : `(${line.text})`}`;
}

function lineSpeaker(line: StoryLine) {
  if (line.kind === "dialogue") {
    return line.speaker;
  }

  return line.kind === "sensei" || line.kind === "choice" ? "Sensei" : null;
}

function topSpeakers(lines: StoryLine[]) {
  const counts = new Map<string, number>();

  for (const line of lines) {
    const speaker = lineSpeaker(line);

    if (speaker) {
      counts.set(speaker, (counts.get(speaker) ?? 0) + 1);
    }
  }

  return [
    ...counts,
  ]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_LISTED_SPEAKERS)
    .map(([speaker]) => speaker);
}

type Chunk = {
  lines: StoryLine[];
  locations: string[];
};

const textLength = (lines: StoryLine[]) =>
  lines.reduce((sum, line) => sum + formatStoryLine(line).length + 1, 0);

function chunkEpisode(episode: StoryEpisode): Chunk[] {
  const chunks: Chunk[] = [];

  let current: Chunk = {
    lines: [],
    locations: [],
  };

  const flush = () => {
    if (current.lines.length > 0) {
      chunks.push(current);
    }

    current = {
      lines: [],
      locations: [],
    };
  };

  const addLocation = (chunk: Chunk, location: string | null) => {
    if (location && !chunk.locations.includes(location)) {
      chunk.locations.push(location);
    }
  };

  for (const scene of episode.scenes) {
    const size = textLength(scene.lines);

    if (textLength(current.lines) + size <= TARGET_CHARS) {
      current.lines.push(...scene.lines);
      addLocation(current, scene.location);
      continue;
    }

    flush();

    if (size <= TARGET_CHARS) {
      current.lines.push(...scene.lines);
      addLocation(current, scene.location);
      continue;
    }

    addLocation(current, scene.location);

    for (const line of scene.lines) {
      const lineSize = formatStoryLine(line).length + 1;

      if (
        current.lines.length > OVERLAP_LINES &&
        textLength(current.lines) + lineSize > TARGET_CHARS
      ) {
        const overlap = current.lines.slice(-OVERLAP_LINES);
        flush();
        current.lines.push(...overlap);
        addLocation(current, scene.location);
      }

      current.lines.push(line);
    }
  }

  flush();

  const merged: Chunk[] = [];

  for (const chunk of chunks) {
    const previous = merged.at(-1);

    if (previous && textLength(chunk.lines) < MIN_CHARS) {
      previous.lines.push(...chunk.lines);

      for (const location of chunk.locations) {
        addLocation(previous, location);
      }
    } else {
      merged.push(chunk);
    }
  }

  // A chunk of nothing but "..." would only match noise.
  return merged.filter((chunk) =>
    chunk.lines.some((line) => /\p{L}{3}/u.test(line.text)),
  );
}

function openAt(episode: StoryEpisode) {
  if (!episode.openDate) {
    return 0;
  }

  const time = Date.parse(`${episode.openDate.replace(" ", "T")}Z`);
  return Number.isNaN(time) ? 0 : time;
}

function makeRecord(
  id: string,
  header: string,
  text: string,
  metadata: Omit<StoryRecordMetadata, "hash">,
): StoryRecord {
  const data = `${header}${STORY_HEADER_SEPARATOR}${text}`;

  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        version: STORY_PIPELINE_VERSION,
        data,
        metadata,
      }),
    )
    .digest("base64url")
    .slice(0, 22);

  return {
    id,
    data,
    metadata: {
      ...metadata,
      hash,
    },
  };
}

function chapterRecord(episodes: StoryEpisode[]): StoryRecord {
  const sorted = [
    ...episodes,
  ].sort((a, b) => a.order - b.order);

  const first = sorted[0];

  const speakers = topSpeakers(
    sorted.flatMap((episode) => episode.scenes.flatMap((s) => s.lines)),
  );

  const header = [
    `[${storyPath(first, false).join(" > ")}]`,
    `Summary of the whole chapter. Characters: ${speakers.join(", ")}`,
  ].join("\n");

  const digests = sorted
    .map((episode) =>
      episode.summary
        ? `${episode.title ? `${episode.title}: ` : ""}${episode.summary}`
        : null,
    )
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_CHAPTER_SUMMARY_CHARS);

  return makeRecord(`${first.chapterId}:chapter`, header, digests, {
    kind: "chapterSummary",
    type: first.type,
    chapterId: first.chapterId,
    episodeId: first.chapterId,
    order: 0,
    chunkIndex: 0,
    speakers,
    openAt: Math.min(...sorted.map(openAt)),
  });
}

export function buildStoryRecords(episodes: StoryEpisode[]): StoryRecord[] {
  const records: StoryRecord[] = [];
  const chapters = new Map<string, StoryEpisode[]>();

  for (const episode of episodes) {
    chapters.set(episode.chapterId, [
      ...(chapters.get(episode.chapterId) ?? []),
      episode,
    ]);

    const shared = {
      type: episode.type,
      chapterId: episode.chapterId,
      episodeId: episode.id,
      order: episode.order,
      openAt: openAt(episode),
    };

    const path = `[${storyPath(episode, true).join(" > ")}]`;

    chunkEpisode(episode).forEach((chunk, chunkIndex) => {
      const speakers = topSpeakers(chunk.lines);

      const details = [
        chunk.locations.length > 0
          ? `Location: ${chunk.locations.join(", ")}`
          : null,
        speakers.length > 0 ? `Speakers: ${speakers.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      records.push(
        makeRecord(
          `${episode.id}:c${chunkIndex}`,
          details ? `${path}\n${details}` : path,
          chunk.lines.map(formatStoryLine).join("\n"),
          {
            ...shared,
            kind: "scene",
            chunkIndex,
            speakers,
          },
        ),
      );
    });

    if (episode.summary) {
      const speakers = topSpeakers(episode.scenes.flatMap((s) => s.lines));

      records.push(
        makeRecord(
          `${episode.id}:summary`,
          `${path}\nSummary of the episode. Characters: ${speakers.join(", ")}`,
          episode.summary,
          {
            ...shared,
            kind: "episodeSummary",
            chunkIndex: 0,
            speakers,
          },
        ),
      );
    }
  }

  for (const chapterEpisodes of chapters.values()) {
    if (chapterEpisodes.length > 1) {
      records.push(chapterRecord(chapterEpisodes));
    }
  }

  return records;
}
