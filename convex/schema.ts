import { STAR_LEVELS, UE_LEVELS } from "@/lib/types";
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
    visibility: v.union(v.literal("private"), v.literal("public")),
    items: v.array(
      v.union(timelineStudentItem, timelineSeparatorItem, timelineTextItem),
    ),
    itemSpacing: v.optional(v.number()),
    verticalSeparatorSize: v.optional(v.number()),
    horizontalSeparatorSize: v.optional(v.number()),
  }).index("by_userId", ["userId"]),

  inventoryManagementGrid: defineTable({
    userId: v.id("users"),
    name: v.optional(v.string()),
    first: inventoryManagementItem,
    second: inventoryManagementItem,
    third: inventoryManagementItem,
    blockedCells: v.array(inventoryManagementCoords),
  }).index("by_userId", ["userId"]),
});
