import "server-only";

import { db } from "@/lib/db";
import { type ScopedItem, scopeItem } from "@/lib/inventory-scan/scope";

/** The items the inventory scanner keeps track of. */
export async function getScanItems(): Promise<ScopedItem[]> {
  const items = await db.gameItem.findMany({
    where: {
      OR: [
        {
          parcelType: "Equipment",
        },
        {
          parcelType: "Item",
          itemCategory: {
            in: [
              "CharacterExpGrowth",
              "Consumable",
              "Favor",
              "Material",
            ],
          },
        },
      ],
    },
    select: {
      parcelType: true,
      itemId: true,
      name: true,
      nameJP: true,
      iconName: true,
      rarity: true,
      itemCategory: true,
    },
    orderBy: {
      itemId: "asc",
    },
  });

  return items.flatMap((item) => scopeItem(item) ?? []);
}
