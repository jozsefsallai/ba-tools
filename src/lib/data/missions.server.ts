import "server-only";

import { db } from "@/lib/db";
import type {
  MissionMapData,
  MissionRewardData,
} from "@/lib/game-data/contract";
import type { MissionSolutions } from "@/lib/missions/solver";
import type { MissionDifficulty, Prisma } from "~prisma";

const summarySelect = {
  id: true,
  chapter: true,
  stage: true,
  difficulty: true,
  cost: true,
  echelonCount: true,
  recommendedLevel: true,
  terrain: true,
  fog: true,
  starTurns: true,
  challengeTurns: true,
  starSRanks: true,
  isReleasedGlobal: true,
  rewards: true,
  fastestTurns: true,
} as const satisfies Prisma.CampaignMissionSelect;

export type MissionSummary = Omit<
  Prisma.CampaignMissionGetPayload<{
    select: typeof summarySelect;
  }>,
  "rewards"
> & {
  rewards: MissionRewardData[];
};

export type MissionDetail = MissionSummary & {
  map: MissionMapData;
  solutions: MissionSolutions;
};

export async function listMissions(): Promise<MissionSummary[]> {
  const rows = await db.campaignMission.findMany({
    select: summarySelect,
    orderBy: [
      {
        chapter: "asc",
      },
      {
        difficulty: "asc",
      },
      {
        stage: "asc",
      },
    ],
  });

  return rows.map((row) => ({
    ...row,
    rewards: row.rewards as unknown as MissionRewardData[],
  }));
}

export async function getMission(where: {
  chapter: number;
  stage: number;
  difficulty: MissionDifficulty;
}): Promise<MissionDetail | null> {
  const row = await db.campaignMission.findUnique({
    where: {
      chapter_difficulty_stage: where,
    },
    select: {
      ...summarySelect,
      map: true,
      solutions: true,
    },
  });

  if (!row) {
    return null;
  }

  return {
    ...row,
    rewards: row.rewards as unknown as MissionRewardData[],
    map: row.map as unknown as MissionMapData,
    solutions: row.solutions as unknown as MissionSolutions,
  };
}

export async function getMissionNeighbours(id: number) {
  const all = await db.campaignMission.findMany({
    select: {
      id: true,
      chapter: true,
      stage: true,
      difficulty: true,
    },
    orderBy: [
      {
        difficulty: "asc",
      },
      {
        chapter: "asc",
      },
      {
        stage: "asc",
      },
    ],
  });

  const index = all.findIndex((m) => m.id === id);

  return {
    previous: index > 0 ? all[index - 1] : null,
    next: index >= 0 && index < all.length - 1 ? all[index + 1] : null,
  };
}
