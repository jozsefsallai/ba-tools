import {
  ATTACK_TYPES,
  BONUS_CAMPAIGN_TYPES,
  DEFENSE_TYPES,
  EVENT_RUN_TYPES,
  MULTI_FLOOR_RAID_BOSSES,
  RAID_BOSSES,
  RAID_TYPES,
  SCENARIO_TYPES,
  TERRAINS,
  TIME_ATTACK_DUNGEON_TYPES,
  WORLD_RAID_BOSSES,
} from "@/lib/roadmap/constants";
import type { EditableRoadmapKind } from "@/lib/roadmap/types";
import { z } from "zod";

const dates = {
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
};

export const raidRoomSchema = z.object({
  attackTypes: z.array(z.enum(ATTACK_TYPES)),
  defenseTypes: z.array(z.enum(DEFENSE_TYPES)),
  terrains: z.array(z.enum(TERRAINS)),
  hasTorment: z.boolean(),
  hasLunatic: z.boolean(),
});

export const raidInputSchema = z.object({
  ...dates,
  type: z.enum(RAID_TYPES),
  raidBoss: z.enum(RAID_BOSSES).nullable(),
  multiFloorRaidBoss: z.enum(MULTI_FLOOR_RAID_BOSSES).nullable(),
  worldRaidBoss: z.enum(WORLD_RAID_BOSSES).nullable(),
  timeAttackDungeonType: z.enum(TIME_ATTACK_DUNGEON_TYPES).nullable(),
  attackTypes: z.array(z.enum(ATTACK_TYPES)),
  defenseTypes: z.array(z.enum(DEFENSE_TYPES)),
  terrains: z.array(z.enum(TERRAINS)),
  rooms: z.array(raidRoomSchema).max(3),
});

export const eventInputSchema = z.object({
  ...dates,
  name: z.string().min(1),
  internalId: z.string(),
  type: z.enum(EVENT_RUN_TYPES),
  eventStudentId: z.string().nullable(),
});

export const storyInputSchema = z.object({
  ...dates,
  name: z.string().min(1),
  internalId: z.string(),
  type: z.enum(SCENARIO_TYPES),
  episodeCount: z.number().int().min(0),
});

export const bonusInputSchema = z.object({
  ...dates,
  type: z.enum(BONUS_CAMPAIGN_TYPES),
  bonusMultiply: z.number().int().min(1),
});

export const namedInputSchema = z.object({
  ...dates,
  name: z.string().min(1),
});

export const etcInputSchema = z.object({
  ...dates,
  label: z.string().min(1),
  description: z.string().nullable(),
});

export const roadmapInputSchemas = {
  raid: raidInputSchema,
  frr: raidInputSchema,
  event: eventInputSchema,
  story: storyInputSchema,
  bonus: bonusInputSchema,
  workLog: namedInputSchema,
  battlePass: namedInputSchema,
  etc: etcInputSchema,
} satisfies Record<EditableRoadmapKind, z.ZodObject>;

export type RoadmapInput<K extends EditableRoadmapKind> = z.infer<
  (typeof roadmapInputSchemas)[K]
>;

export type AnyRoadmapInput = {
  [K in EditableRoadmapKind]: RoadmapInput<K>;
}[EditableRoadmapKind];

export const offsetRoadmapSchema = z.object({
  ids: z.array(z.string()).min(1),
  offsetMs: z.number().int(),
});

export type OffsetRoadmapInput = z.infer<typeof offsetRoadmapSchema>;
