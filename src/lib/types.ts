import type { Student } from "@prisma/client";

export const STAR_LEVELS = [1, 2, 3, 4, 5] as const;
export const UE_LEVELS = [1, 2, 3, 4] as const;

export type StarLevel = (typeof STAR_LEVELS)[number];
export type UELevel = (typeof UE_LEVELS)[number];

export type { Student };
