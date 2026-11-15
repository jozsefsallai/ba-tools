import { db } from "../db";
import type { Prisma } from "../db/client";
import type {
  ExtractUpcomingContentResult,
  UpcomingChapter,
  UpcomingEvent,
  UpcomingRaid,
  UpcomingRaidKind,
} from "./contract";

export type UpcomingContentKind = UpcomingRaidKind | "event" | "chapter";

export const UPCOMING_RAID_KINDS = [
  "raid",
  "eliminateRaid",
  "multiFloorRaid",
  "timeAttackDungeon",
] as const satisfies readonly UpcomingRaidKind[];

export type SaveUpcomingContentResult = {
  saved: number;
  removed: number;
};

type CacheRow = {
  id: string;
  kind: UpcomingContentKind;
  sourceId: string;
  sortOrder: number;
  data: Prisma.InputJsonValue;
};

function toRows(result: ExtractUpcomingContentResult): CacheRow[] {
  const positions = new Map<string, number>();
  const next = (kind: string) => {
    const position = positions.get(kind) ?? 0;
    positions.set(kind, position + 1);
    return position;
  };

  return [
    ...result.raids.map((raid) => ({
      id: `${raid.kind}:${raid.seasonId}`,
      kind: raid.kind,
      sourceId: String(raid.seasonId),
      sortOrder: next(raid.kind),
      data: raid as unknown as Prisma.InputJsonValue,
    })),
    ...result.events.map((event) => ({
      id: `event:${event.id}`,
      kind: "event" as const,
      sourceId: String(event.id),
      sortOrder: next("event"),
      data: event as unknown as Prisma.InputJsonValue,
    })),
    ...result.chapters.map((chapter) => ({
      id: `chapter:${chapter.id}`,
      kind: "chapter" as const,
      sourceId: chapter.id,
      // chapters are only in order within their mode type
      sortOrder: chapter.order,
      data: chapter as unknown as Prisma.InputJsonValue,
    })),
  ];
}

export async function saveUpcomingContent(
  result: ExtractUpcomingContentResult,
): Promise<SaveUpcomingContentResult> {
  const rows = toRows(result);
  const kinds = [
    ...new Set(rows.map((row) => row.kind)),
  ];
  const gameVersion = result.gameVersion.jp;
  const where = {
    kind: {
      in: kinds,
    },
  };

  const ids = new Set(rows.map((row) => row.id));
  const previous = await db.upcomingContent.findMany({
    where,
    select: {
      id: true,
    },
  });

  await db.$transaction([
    db.upcomingContent.deleteMany({
      where,
    }),
    db.upcomingContent.createMany({
      data: rows.map((row) => ({
        ...row,
        gameVersion,
      })),
    }),
  ]);

  return {
    saved: rows.length,
    removed: previous.filter((row) => !ids.has(row.id)).length,
  };
}

export type CachedUpcomingContent = {
  raids: UpcomingRaid[];
  events: UpcomingEvent[];
  chapters: UpcomingChapter[];
  syncedAt: Date | null;
  gameVersion: string | null;
};

export async function loadUpcomingContent(
  kinds: readonly UpcomingContentKind[],
): Promise<CachedUpcomingContent> {
  const [rows, latest] = await Promise.all([
    db.upcomingContent.findMany({
      where: {
        kind: {
          in: [
            ...kinds,
          ],
        },
      },
      orderBy: {
        sortOrder: "asc",
      },
    }),
    db.upcomingContent.findFirst({
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        updatedAt: true,
        gameVersion: true,
      },
    }),
  ]);

  const raidKinds: readonly string[] = UPCOMING_RAID_KINDS;

  return {
    raids: rows
      .filter((row) => raidKinds.includes(row.kind))
      .map((row) => row.data as unknown as UpcomingRaid),
    events: rows
      .filter((row) => row.kind === "event")
      .map((row) => row.data as unknown as UpcomingEvent),
    chapters: rows
      .filter((row) => row.kind === "chapter")
      .map((row) => row.data as unknown as UpcomingChapter),
    syncedAt: latest?.updatedAt ?? null,
    gameVersion: latest?.gameVersion ?? null,
  };
}
