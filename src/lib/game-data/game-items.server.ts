import type { Prisma } from "~prisma";
import { db } from "../db";
import type { GameItemData } from "./contract";

const BATCH_SIZE = 500;

const toRow = (item: GameItemData) => ({
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
});

export async function replaceGameItems(
  tx: Prisma.TransactionClient,
  items: GameItemData[],
) {
  const rows = items.map(toRow);

  await tx.gameItem.deleteMany({
    where: {
      OR: [
        ...new Set(rows.map((row) => row.parcelType)),
      ].map((parcelType) => ({
        parcelType,
        itemId: {
          in: rows
            .filter((row) => row.parcelType === parcelType)
            .map((row) => row.itemId),
        },
      })),
    },
  });

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await tx.gameItem.createMany({
      data: rows.slice(i, i + BATCH_SIZE),
    });
  }
}

export interface SaveGameItemsResult {
  items: number;
}

export async function saveGameItems(
  items: GameItemData[],
): Promise<SaveGameItemsResult> {
  await db.$transaction((tx) => replaceGameItems(tx, items), {
    maxWait: 10_000,
    timeout: 120_000,
  });

  return {
    items: items.length,
  };
}
