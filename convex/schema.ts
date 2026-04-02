import {
  BORROW_SLOT_GAMEMODES,
  GAME_SERVERS,
  STAR_LEVELS,
  UE_LEVELS,
} from "@/lib/types";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const formationStudentItem = v.object({
  studentId: v.optional(v.string()),
  starter: v.optional(v.boolean()),
  starLevel: v.optional(
    v.union(...STAR_LEVELS.map((level) => v.literal(level))),
  ),
  ueLevel: v.optional(v.union(...UE_LEVELS.map((level) => v.literal(level)))),
  borrowed: v.optional(v.boolean()),
  level: v.optional(v.number()),
});

export const timelineStudentItem = v.object({
  type: v.literal("student"),
  studentId: v.string(),
  trigger: v.optional(v.string()),
  targetId: v.optional(v.string()),
  copy: v.optional(v.boolean()),
  variantId: v.optional(v.string()),
  notes: v.optional(v.string()),
});

export const timelineSeparatorOrientation = v.union(
  v.literal("horizontal"),
  v.literal("vertical"),
);

export const timelineSeparatorItem = v.object({
  type: v.literal("separator"),
  orientation: timelineSeparatorOrientation,
  size: v.optional(v.number()),
});

export const timelineTextItem = v.object({
  type: v.literal("text"),
  text: v.string(),
});

export const inventoryManagementItem = v.object({
  width: v.number(),
  height: v.number(),
  count: v.number(),
});

export const inventoryManagementCoords = v.object({
  x: v.number(),
  y: v.number(),
});

export const rosterItem = v.object({
  studentId: v.string(),
  starLevel: v.union(...STAR_LEVELS.map((level) => v.literal(level))),
  ueLevel: v.optional(v.union(...UE_LEVELS.map((level) => v.literal(level)))),
  level: v.number(),
  relationshipRank: v.number(),
  ex: v.number(),
  basic: v.number(),
  enhanced: v.number(),
  sub: v.number(),
  equipmentSlot1: v.optional(v.number()),
  equipmentSlot2: v.optional(v.number()),
  equipmentSlot3: v.optional(v.number()),
  equipmentSlot4: v.optional(v.number()),
  attackLevel: v.optional(v.number()),
  hpLevel: v.optional(v.number()),
  healLevel: v.optional(v.number()),
  featuredBorrowSlot: v.optional(
    v.union(...BORROW_SLOT_GAMEMODES.map((mode) => v.literal(mode))),
  ),
});

export const pvpFormationStudentItem = v.object({
  studentId: v.optional(v.string()),
  level: v.optional(v.number()),
  starLevel: v.optional(
    v.union(...STAR_LEVELS.map((level) => v.literal(level))),
  ),
  ueLevel: v.optional(v.union(...UE_LEVELS.map((level) => v.literal(level)))),
  damage: v.optional(v.number()),
});

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    username: v.string(),
    avatar: v.optional(v.string()),
    externalId: v.string(),
  }).index("by_externalId", ["externalId"]),

  userPreferences: defineTable({
    userId: v.id("users"),
    timelineVisualizer: v.object({
      triggerAutoFocus: v.boolean(),
      defaultScale: v.number(),
      defaultItemSpacing: v.number(),
      defaultVerticalSeparatorSize: v.number(),
      defaultHorizontalSeparatorSize: v.number(),
    }),
    formationDisplay: v.object({
      defaultScale: v.number(),
      defaultDisplayOverline: v.boolean(),
      defaultNoDisplayRole: v.boolean(),
      defaultGroupsVertical: v.boolean(),
    }),
  }).index("by_userId", ["userId"]),

  formation: defineTable({
    userId: v.id("users"),
    name: v.optional(v.string()),
    strikers: v.array(formationStudentItem),
    specials: v.array(formationStudentItem),
    displayOverline: v.optional(v.boolean()),
    noDisplayRole: v.optional(v.boolean()),
    groupsVertical: v.optional(v.boolean()),
  }).index("by_userId", ["userId"]),

  timeline: defineTable({
    userId: v.id("users"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.union(v.literal("private"), v.literal("public")),
    showCreator: v.optional(v.boolean()),
    items: v.array(
      v.union(timelineStudentItem, timelineSeparatorItem, timelineTextItem),
    ),
    itemSpacing: v.optional(v.number()),
    verticalSeparatorSize: v.optional(v.number()),
    horizontalSeparatorSize: v.optional(v.number()),
  }).index("by_userId", ["userId"]),

  timelineGroup: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    visibility: v.union(v.literal("private"), v.literal("public")),
    showCreator: v.optional(v.boolean()),
    timelines: v.array(v.id("timeline")),
  }).index("by_userId", ["userId"]),

  roster: defineTable({
    userId: v.id("users"),
    name: v.optional(v.string()),
    introduction: v.optional(v.string()),
    accountLevel: v.number(),
    studentRepId: v.optional(v.string()),
    visibility: v.union(v.literal("private"), v.literal("public")),
    gameServer: v.union(...GAME_SERVERS.map((level) => v.literal(level))),
    friendCode: v.string(),
    students: v.array(rosterItem),
    lastUpdated: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_gameServerAndFriendCode", ["gameServer", "friendCode"]),

  inventoryManagementGrid: defineTable({
    userId: v.id("users"),
    name: v.optional(v.string()),
    first: inventoryManagementItem,
    second: inventoryManagementItem,
    third: inventoryManagementItem,
    blockedCells: v.array(inventoryManagementCoords),
  }).index("by_userId", ["userId"]),

  giftInventory: defineTable({
    userId: v.id("users"),
    name: v.optional(v.string()),
    gifts: v.array(
      v.object({
        id: v.number(),
        count: v.number(),
      }),
    ),
    giftBoxes: v.optional(v.number()),
  }).index("by_userId", ["userId"]),

  giftTarget: defineTable({
    userId: v.id("users"),
    giftInventoryId: v.id("giftInventory"),
    studentId: v.string(),
    currentExp: v.number(),
    targetExp: v.optional(v.number()),
    gifts: v.array(
      v.object({
        id: v.number(),
        enabled: v.boolean(),
      }),
    ),
    useGiftBoxes: v.optional(v.boolean()),
  })
    .index("by_userId", ["userId"])
    .index("by_giftInventory", ["giftInventoryId"])
    .index("by_studentId", ["studentId"]),

  pvpSeason: defineTable({
    userId: v.id("users"),
    name: v.string(),
    gameServer: v.union(...GAME_SERVERS.map((level) => v.literal(level))),
  }).index("by_userId", ["userId"]),

  pvpMatchRecord: defineTable({
    userId: v.id("users"),
    seasonId: v.id("pvpSeason"),
    date: v.number(),
    ownRank: v.optional(v.number()),
    opponentName: v.optional(v.string()),
    opponentStudentRepId: v.optional(v.string()),
    opponentRank: v.optional(v.number()),
    matchType: v.union(v.literal("attack"), v.literal("defense")),
    ownTeam: v.array(pvpFormationStudentItem),
    opponentTeam: v.array(pvpFormationStudentItem),
    result: v.union(v.literal("win"), v.literal("loss")),
    videoUrl: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_seasonId", ["seasonId"]),
});
