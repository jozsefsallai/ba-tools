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
  parcels: {
    parcelType: ParcelType;
    parcelId: number;
  }[],
): Promise<GameItemSummary[]> {
  const ids = new Map<ParcelType, Set<number>>();

  for (const { parcelType, parcelId } of parcels) {
    ids.set(parcelType, (ids.get(parcelType) ?? new Set()).add(parcelId));
  }

  return await db.gameItem.findMany({
    where: {
      OR: [
        ...ids,
      ].map(([parcelType, itemIds]) => ({
        parcelType,
        itemId: {
          in: [
            ...itemIds,
          ],
        },
      })),
    },
    select: summarySelect,
  });
}
