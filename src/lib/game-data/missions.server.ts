import { missionLabel } from "@/lib/missions/labels";
import { solveMission } from "@/lib/missions/solver";
import type { Prisma } from "~prisma";
import { db } from "../db";
import type { ExtractMissionsResult } from "./contract";

export interface SaveMissionsResult {
  missions: number;
  items: number;
  removed: number;
  unsolved: string[];
}

const json = (value: unknown) => value as Prisma.InputJsonValue;

export async function saveMissions(
  result: ExtractMissionsResult,
  log: (message: string) => void = () => {},
): Promise<SaveMissionsResult> {
  const unsolved: string[] = [];

  const rows = result.missions.map((mission) => {
    const started = Date.now();

    const solutions = solveMission(mission.map, {
      echelonCount: mission.echelonCount,
      sRanks: mission.starSRanks,
    });

    const label = missionLabel(mission);
    if (!solutions.fastest) {
      unsolved.push(label);
    }

    log(
      `${label}: ${solutions.fastest?.turns ?? "no"} turns (${Date.now() - started} ms)`,
    );

    return {
      ...mission,
      rewards: json(mission.rewards),
      map: json(mission.map),
      solutions: json(solutions),
      fastestTurns: solutions.fastest?.turns ?? null,
      gameVersion: result.gameVersion.jp,
    };
  });

  const items = result.items.map((item) => ({
    parcelType: item.parcelType,
    itemId: item.id,
    name: item.names.en ?? null,
    nameJP: item.names.jp ?? null,
    nameKR: item.names.kr ?? null,
    nameTW: item.names.tw ?? null,
    nameTH: item.names.th ?? null,
    iconName: item.iconName,
    rarity: item.rarity,
    itemCategory: item.parcelType === "Item" ? item.itemCategory : null,
    equipmentCategory:
      item.parcelType === "Equipment" ? item.equipmentCategory : null,
    tier: item.parcelType === "Equipment" ? item.tier : null,
  }));

  const ids = rows.map((r) => r.id);

  const removed = await db.$transaction(
    async (tx) => {
      const { count } = await tx.campaignMission.deleteMany({
        where: {
          id: {
            notIn: ids,
          },
        },
      });

      await tx.campaignMission.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });

      await tx.campaignMission.createMany({
        data: rows,
      });

      await tx.gameItem.deleteMany({
        where: {
          OR: (
            [
              "Item",
              "Equipment",
            ] as const
          ).map((parcelType) => ({
            parcelType,
            itemId: {
              in: items
                .filter((item) => item.parcelType === parcelType)
                .map((item) => item.itemId),
            },
          })),
        },
      });

      await tx.gameItem.createMany({
        data: items,
      });

      return count;
    },
    {
      maxWait: 10_000,
      timeout: 120_000,
    },
  );

  return {
    missions: rows.length,
    items: items.length,
    removed,
    unsolved,
  };
}
