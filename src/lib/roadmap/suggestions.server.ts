import "server-only";

import { db } from "@/lib/db";
import {
  loadUpcomingContent,
  UPCOMING_RAID_KINDS,
  type UpcomingContentKind,
} from "@/lib/game-data/upcoming-content.server";
import { fetchRoadmapHistory } from "@/lib/roadmap/roadmap.server";
import {
  type RoadmapSuggestion,
  suggestEvents,
  suggestRaids,
  suggestStories,
} from "@/lib/roadmap/suggestions";
import type {
  EditableRoadmapKind,
  RoadmapEventItem,
  RoadmapRaidItem,
  RoadmapStoryItem,
} from "@/lib/roadmap/types";

export type RoadmapSuggestions = {
  suggestions: RoadmapSuggestion[];
  syncedAt: string | null;
  gameVersion: string | null;
};

const CONTENT_KINDS: Partial<
  Record<EditableRoadmapKind, readonly UpcomingContentKind[]>
> = {
  raid: UPCOMING_RAID_KINDS.filter((kind) => kind !== "multiFloorRaid"),
  frr: [
    "multiFloorRaid",
  ],
  event: [
    "event",
  ],
  story: [
    "chapter",
  ],
};

async function studentIdsByCharacterId(characterIds: number[]) {
  if (characterIds.length === 0) {
    return new Map<number, string>();
  }

  const students = await db.student.findMany({
    where: {
      schaleDbId: {
        in: characterIds,
      },
    },
    select: {
      id: true,
      schaleDbId: true,
    },
  });

  return new Map(
    students.map((student) => [
      student.schaleDbId,
      student.id,
    ]),
  );
}

export async function getRoadmapSuggestions(
  kind: EditableRoadmapKind,
  fallbackStartDate: string,
): Promise<RoadmapSuggestions> {
  const contentKinds = CONTENT_KINDS[kind];

  if (
    !contentKinds ||
    (kind !== "raid" && kind !== "frr" && kind !== "event" && kind !== "story")
  ) {
    return {
      suggestions: [],
      syncedAt: null,
      gameVersion: null,
    };
  }

  const [content, existing] = await Promise.all([
    loadUpcomingContent(contentKinds),
    fetchRoadmapHistory(kind),
  ]);

  let suggestions: RoadmapSuggestion[];

  switch (kind) {
    case "raid":
    case "frr":
      suggestions = suggestRaids(
        kind,
        content.raids,
        existing as RoadmapRaidItem[],
      );
      break;
    case "event":
      suggestions = suggestEvents(
        content.events,
        existing as RoadmapEventItem[],
        await studentIdsByCharacterId([
          ...new Set(
            content.events.flatMap((event) => event.rewardCharacterIds),
          ),
        ]),
      );
      break;
    case "story":
      suggestions = suggestStories(
        content.chapters,
        existing as RoadmapStoryItem[],
        fallbackStartDate,
      );
      break;
  }

  return {
    suggestions,
    syncedAt: content.syncedAt?.toISOString() ?? null,
    gameVersion: content.gameVersion,
  };
}
