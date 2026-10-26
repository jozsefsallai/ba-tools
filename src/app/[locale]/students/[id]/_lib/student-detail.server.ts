import "server-only";

import { db } from "@/lib/db";
import { resolveStudentIdentifier } from "@/lib/student-resolve.server";
import { cache } from "react";

const GIFT_SELECT = {
  id: true,
  name: true,
  nameJP: true,
  description: true,
  descriptionJP: true,
  iconName: true,
  rarity: true,
} as const;

const VARIANT_SELECT = {
  id: true,
  name: true,
  nameJP: true,
  rarity: true,
  attackType: true,
  defenseType: true,
  combatRole: true,
  school: true,
} as const;

export const resolveStudent = cache(resolveStudentIdentifier);

export const getStudentDetail = cache(async (id: string) => {
  return db.student.findUnique({
    where: { id },
    include: {
      giftsAdored: { select: GIFT_SELECT },
      giftsLoved: { select: GIFT_SELECT },
      giftsLiked: { select: GIFT_SELECT },
      baseVariant: {
        select: {
          ...VARIANT_SELECT,
          variants: { select: VARIANT_SELECT },
        },
      },
      variants: { select: VARIANT_SELECT },
    },
  });
});

export type StudentDetail = NonNullable<
  Awaited<ReturnType<typeof getStudentDetail>>
>;

export type StudentDetailGift = StudentDetail["giftsAdored"][number];

export type StudentDetailVariant = StudentDetail["variants"][number];
