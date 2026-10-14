import z from "zod";
import {
  BannerChargeCategory,
  BannerCounterKind,
  BannerKind,
} from "../lib/db/client";

export const rawGameBanner = z.object({
  start: z.tuple([z.number().int(), z.number().int(), z.number().int()]),
  end: z.tuple([z.number().int(), z.number().int(), z.number().int()]),
  students: z.array(z.string()),
  freePulls: z.number().int().optional(),
  name: z.string().optional(),
  isSelectablePickup: z.boolean().optional(),
});

export type RawGameBanner = z.infer<typeof rawGameBanner>;

export const addGameBannersPayload = z.object({
  banners: z.array(rawGameBanner),
});

export type AddGameBannersPayload = z.infer<typeof addGameBannersPayload>;

export const offsetGameBannersPayload = z.object({
  currentStart: z.tuple([z.number().int(), z.number().int(), z.number().int()]),
  offsetDays: z.number().int(),
});

export type OffsetGameBannersPayload = z.infer<typeof offsetGameBannersPayload>;

export const rawBanner = z.object({
  id: z.string(),
  name: z.string(),
  isPickup: z.boolean(),
  isFest: z.boolean(),
  kind: z.enum(BannerKind),
  counterKind: z.enum(BannerCounterKind),
  chargeCategory: z.enum(BannerChargeCategory).optional(),
  pickupStudents: z.array(z.string()).optional(),
  extraStudents: z.array(z.string()).optional(),
  additionalThreeStarStudents: z.array(z.string()).optional(),
});

export type RawBanner = z.infer<typeof rawBanner>;

export const setBannersPayload = z.object({
  banners: z.array(rawBanner),
});

export type SetBannersPayload = z.infer<typeof setBannersPayload>;

const sqlcipherKey = z
  .string()
  .regex(/^[0-9a-fA-F]{64}$/, "Expected 64 hex characters");

export const listNewStudentsPayload = z.object({ sqlcipherKey });

export type ListNewStudentsPayload = z.input<typeof listNewStudentsPayload>;

export const syncImageAssetsPayload = z.object({
  sqlcipherKey,
  devNames: z.array(z.string().min(1)).min(1),
  dryRun: z.boolean().default(false),
  overwrite: z.boolean().default(true),
});

export type SyncImageAssetsPayload = z.input<typeof syncImageAssetsPayload>;

const perServerTuple = <T extends z.ZodType>(item: T) =>
  z.tuple([item, item, item]);

const nameOverride = z.object({
  name: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});

export const seedStudentInput = z.looseObject({
  Id: z.number().int(),
  PathName: z.string().min(1),
  DevName: z.string().min(1),
  Name: z.string().min(1),
  IsReleased: perServerTuple(z.boolean()),
  IsLimited: perServerTuple(z.number().int()),
  SearchTags: z.array(z.string()),
  baseVariantId: z.string().min(1).nullable().optional(),
  __nameOverrides: z
    .object({
      en: nameOverride.optional(),
      jp: nameOverride.optional(),
      kr: nameOverride.optional(),
      tw: nameOverride.optional(),
      th: nameOverride.optional(),
    })
    .optional(),
});

export const seedStudentsPayload = z.object({
  students: z.array(seedStudentInput).optional(),
});

export type SeedStudentsPayload = z.input<typeof seedStudentsPayload>;
