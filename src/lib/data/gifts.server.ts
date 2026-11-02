import "server-only";

import { db } from "@/lib/db";

const studentSelect = {
  select: {
    id: true,
    name: true,
  },
} as const;

const giftSelect = {
  id: true,
  name: true,
  nameJP: true,
  rarity: true,
  expValue: true,
  iconName: true,
  isLovedByEveryone: true,
  adoredBy: studentSelect,
  lovedBy: studentSelect,
  likedBy: studentSelect,
} as const;

export async function searchGifts({
  query,
  limit,
}: {
  query?: string;
  limit?: number;
}) {
  const q = query?.trim();

  return await db.gift.findMany({
    where: q
      ? {
          OR: [
            {
              name: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              nameJP: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : undefined,
    take: limit,
    orderBy: {
      id: "asc",
    },
    select: giftSelect,
  });
}

export async function getGift(id: number) {
  return await db.gift.findUnique({
    where: {
      id,
    },
    select: {
      ...giftSelect,
      description: true,
      descriptionJP: true,
    },
  });
}
