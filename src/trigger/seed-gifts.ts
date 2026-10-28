import { type Task, logger, task } from "@trigger.dev/sdk";

import axios from "axios";

import { db } from "../lib/db";
import type { ItemRarity } from "../lib/db/client";
import { fetchStudentsData } from "./lib/common";
import { type SeedGiftsPayload, seedGiftsPayload } from "./schemas";

const ITEMS_TABLE = "https://schaledb.com/data/en/items.min.json";
const ITEMS_TABLE_JP = "https://schaledb.com/data/jp/items.min.json";

type RawItemData = {
  Category: string;
};

type RawGiftItemData = RawItemData & {
  Id: number;
  Rarity: ItemRarity;
  Quality: number;
  Tags: string[];
  Name: string;
  Desc: string;
  ExpValue: number;
  Icon: string;
};

const commonFavorItemTags = ["BC", "Bc", "ew"];

async function fetchGifts() {
  const { data } = await axios.get<Record<string, RawItemData>>(ITEMS_TABLE);

  for (const key in data) {
    if (data[key].Category !== "Favor") {
      delete data[key];
    }
  }

  return data as Record<string, RawGiftItemData>;
}

async function fetchGiftsJP() {
  const { data } = await axios.get<Record<string, RawItemData>>(ITEMS_TABLE_JP);

  for (const key in data) {
    if (data[key].Category !== "Favor") {
      delete data[key];
    }
  }

  return data as Record<string, RawGiftItemData>;
}

type StudentFavorTags = {
  PathName: string;
  FavorItemTags: string[];
  FavorItemUniqueTags: string[];
};

async function setFavorGifts(
  allGifts: RawGiftItemData[],
  providedStudents: StudentFavorTags[] = [],
) {
  const studentsData = await fetchStudentsData();

  const tagsByStudentId = new Map<string, StudentFavorTags>();

  for (const item of Object.values(studentsData)) {
    tagsByStudentId.set(item.PathName, item);
  }

  for (const item of providedStudents) {
    tagsByStudentId.set(item.PathName, item);
  }

  const students = await db.student.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  const sortedGifts = allGifts.sort((a, b) => b.ExpValue - a.ExpValue);

  for await (const student of students) {
    const item = tagsByStudentId.get(student.id);

    if (!item) {
      logger.warn(
        `No favor tags for student ${student.id}. Pass them in the payload to set their gifts.`,
      );
      continue;
    }

    const adoredGiftIds: number[] = [];
    const lovedGiftIds: number[] = [];
    const likedGiftIds: number[] = [];

    const allTags = [
      ...item.FavorItemTags,
      ...item.FavorItemUniqueTags,
      ...commonFavorItemTags,
    ];

    for (const gift of sortedGifts) {
      const commonTagCount = gift.Tags.filter((tag) =>
        commonFavorItemTags.includes(tag),
      ).length;
      const commonTags = gift.Tags.filter((tag) => allTags.includes(tag));

      const favorGrade = Math.min(commonTags.length, 3);

      if (favorGrade - commonTagCount > 0) {
        switch (favorGrade) {
          case 1:
            likedGiftIds.push(gift.Id);
            break;
          case 2:
            lovedGiftIds.push(gift.Id);
            break;
          case 3:
            adoredGiftIds.push(gift.Id);
            break;
        }
      }
    }

    await db.student.update({
      where: {
        id: student.id,
      },
      data: {
        giftsAdored: {
          set: adoredGiftIds.map((id) => ({
            id,
          })),
        },

        giftsLoved: {
          set: lovedGiftIds.map((id) => ({
            id,
          })),
        },

        giftsLiked: {
          set: likedGiftIds.map((id) => ({
            id,
          })),
        },
      },
    });

    logger.info(`Set favor gifts for student: ${student.name}`);
  }
}

async function seedGifts(providedStudents?: StudentFavorTags[]) {
  const gifts = await fetchGifts();
  const giftsJP = await fetchGiftsJP();

  const allGifts = Object.values(gifts);

  for await (const item of allGifts) {
    const giftJP = giftsJP[item.Id];

    let gift = await db.gift.findUnique({
      where: {
        id: item.Id,
      },
    });

    if (!gift) {
      gift = await db.gift.create({
        data: {
          id: item.Id,
          name: item.Name,
          description: item.Desc,
          nameJP: giftJP?.Name ?? "",
          descriptionJP: giftJP?.Desc ?? "",
          iconName: item.Icon,
          rarity: item.Rarity,
          expValue: item.ExpValue,
        },
      });

      logger.info(`Created gift: ${item.Name}`);
    } else {
      gift = await db.gift.update({
        where: {
          id: item.Id,
        },
        data: {
          name: item.Name,
          description: item.Desc,
          nameJP: giftJP?.Name ?? "",
          descriptionJP: giftJP?.Desc ?? "",
          iconName: item.Icon,
          rarity: item.Rarity,
          expValue: item.ExpValue,
        },
      });

      logger.info(`Updated gift: ${item.Name}`);
    }
  }

  await setFavorGifts(allGifts, providedStudents);
}

export const seedGiftsTask: Task<
  "seed-gifts",
  SeedGiftsPayload | undefined,
  void
> = task({
  id: "seed-gifts",
  run: async (payload) => {
    const { students } = seedGiftsPayload.parse(payload ?? {});
    await seedGifts(students);
    logger.info("Gifts seeded successfully");
  },
});
