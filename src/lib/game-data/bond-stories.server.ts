import { db } from "../db";
import type { ExtractBondStoriesResult } from "./contract";

export interface SaveBondStoriesResult {
  students: number;
  episodes: number;
}

export async function saveBondStories(
  result: ExtractBondStoriesResult,
): Promise<SaveBondStoriesResult> {
  const studentIds = [
    ...new Set(result.episodes.map((e) => e.studentId)),
  ];

  await db.$transaction([
    db.studentBondStory.deleteMany({
      where: {
        studentId: {
          in: studentIds,
        },
      },
    }),

    db.studentBondStory.createMany({
      data: result.episodes.map((episode) => ({
        id: episode.id,
        studentId: episode.studentId,
        episode: episode.episode,
        bondRank: episode.favorRank,
        title: episode.titles.en ?? null,
        titleJP: episode.titles.jp ?? null,
        titleKR: episode.titles.kr ?? null,
        titleTW: episode.titles.tw ?? null,
        titleTH: episode.titles.th ?? null,
        isReleasedGlobal: episode.isReleasedGlobal,
        unlocksMemorialLobby: episode.unlocksMemoryLobby,
        unlocksBondGear: episode.unlocksBondGear,
      })),
    }),
  ]);

  return {
    students: studentIds.length,
    episodes: result.episodes.length,
  };
}
