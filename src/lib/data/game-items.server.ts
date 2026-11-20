import "server-only";

import { db } from "@/lib/db";
import type { ParcelType, Prisma } from "~prisma";

const summarySelect = {
  parcelType: true,
  itemId: true,
  name: true,
  nameJP: true,
  iconName: true,
  rarity: true,
  itemCategory: true,
  equipmentCategory: true,
  tier: true,
} as const satisfies Prisma.GameItemSelect;

export type GameItemSummary = Prisma.GameItemGetPayload<{
  select: typeof summarySelect;
}>;

export async function getGameItems(
  parcelTypes?: ParcelType[],
): Promise<GameItemSummary[]> {
  return await db.gameItem.findMany({
    where: parcelTypes
      ? {
          parcelType: {
            in: parcelTypes,
          },
        }
      : undefined,
    select: summarySelect,
  });
}
