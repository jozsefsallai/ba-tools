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

const bondGiftSelect = {
  select: {
    id: true,
    rarity: true,
  },
} as const;

export async function getBondData(studentIds: string[], giftIds: number[]) {
  const [students, gifts] = await Promise.all([
    db.student.findMany({
      where: {
        id: {
          in: studentIds,
        },
      },
      select: {
        id: true,
        giftsAdored: bondGiftSelect,
        giftsLoved: bondGiftSelect,
        giftsLiked: bondGiftSelect,
      },
    }),
    db.gift.findMany({
      where: {
        id: {
          in: giftIds,
        },
      },
      select: {
        id: true,
        rarity: true,
        expValue: true,
        isLovedByEveryone: true,
      },
    }),
  ]);

  return {
    students: new Map(
      students.map((student) => [
        student.id,
        student,
      ]),
    ),
    gifts,
  };
}
