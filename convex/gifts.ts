import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./lib/auth";

const targetGiftValidator = v.object({
  id: v.number(),
  count: v.number(),
});

function normalizeTargetGifts(gifts: { id: number; count: number }[]) {
  return gifts.map(({ id, count }) => ({
    id,
    count,
    enabled: count > 0,
  }));
}

function normalizeGiftBoxCount(giftBoxCount: number) {
  return {
    giftBoxCount,
    useGiftBoxes: giftBoxCount > 0,
  };
}

export const getOwn = authenticatedQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("giftInventory")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .collect();
  },
});

export const getOwnById = authenticatedQuery({
  args: {
    id: v.id("giftInventory"),
  },
  handler: async (ctx, { id }) => {
    const giftInventory = await ctx.db.get(id);

    if (!giftInventory || giftInventory.userId !== ctx.user._id) {
      throw new Error("Gift Inventory not found");
    }

    const giftTargets = await ctx.db
      .query("giftTarget")
      .withIndex("by_giftInventory", (q) => q.eq("giftInventoryId", id))
      .collect();

    return {
      inventory: giftInventory,
      targets: giftTargets,
    };
  },
});

export const createInventory = authenticatedMutation({
  args: {
    name: v.optional(v.string()),
    gifts: v.optional(
      v.array(
        v.object({
          id: v.number(),
          count: v.number(),
        }),
      ),
    ),
    giftBoxes: v.optional(v.number()),
  },
  handler: async (ctx, { name, gifts, giftBoxes }) => {
    const giftInventoryId = await ctx.db.insert("giftInventory", {
      userId: ctx.user._id,
      name,
      gifts: gifts ?? [],
      giftBoxes: giftBoxes ?? 0,
    });

    return giftInventoryId;
  },
});

export const createTarget = authenticatedMutation({
  args: {
    giftInventoryId: v.id("giftInventory"),
    studentId: v.string(),
    currentExp: v.optional(v.number()),
    targetExp: v.optional(v.number()),
    gifts: v.optional(v.array(targetGiftValidator)),
    giftBoxCount: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { giftInventoryId, studentId, currentExp, targetExp, gifts, giftBoxCount },
  ) => {
    const giftInventory = await ctx.db.get(giftInventoryId);

    if (!giftInventory || giftInventory.userId !== ctx.user._id) {
      throw new Error("Gift Inventory not found");
    }

    const existing = await ctx.db
      .query("giftTarget")
      .withIndex("by_studentId", (q) => q.eq("studentId", studentId))
      .first();

    if (existing && existing.giftInventoryId === giftInventoryId) {
      throw new Error("Gift Target for this student already exists");
    }

    const boxCount = giftBoxCount ?? 0;

    const giftTargetId = await ctx.db.insert("giftTarget", {
      userId: ctx.user._id,
      giftInventoryId,
      studentId,
      currentExp: currentExp ?? 0,
      targetExp,
      gifts: gifts ? normalizeTargetGifts(gifts) : [],
      ...normalizeGiftBoxCount(boxCount),
    });

    return giftTargetId;
  },
});

export const updateInventory = authenticatedMutation({
  args: {
    id: v.id("giftInventory"),
    name: v.optional(v.string()),
    gifts: v.optional(
      v.array(
        v.object({
          id: v.number(),
          count: v.number(),
        }),
      ),
    ),
    giftBoxes: v.optional(v.number()),
  },
  handler: async (ctx, { id, name, gifts, giftBoxes }) => {
    const giftInventory = await ctx.db.get(id);

    if (!giftInventory || giftInventory.userId !== ctx.user._id) {
      throw new Error("Gift Inventory not found");
    }

    await ctx.db.patch(id, {
      name: name ?? giftInventory.name,
      gifts: gifts ?? giftInventory.gifts,
      giftBoxes: giftBoxes ?? giftInventory.giftBoxes,
    });
  },
});

export const updateTarget = authenticatedMutation({
  args: {
    id: v.id("giftTarget"),
    studentId: v.optional(v.string()),
    currentExp: v.optional(v.number()),
    targetExp: v.optional(v.number()),
    gifts: v.optional(v.array(targetGiftValidator)),
    giftBoxCount: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { id, studentId, currentExp, targetExp, gifts, giftBoxCount },
  ) => {
    const giftTarget = await ctx.db.get(id);

    if (!giftTarget || giftTarget.userId !== ctx.user._id) {
      throw new Error("Gift Target not found");
    }

    const patch: Record<string, unknown> = {
      studentId: studentId ?? giftTarget.studentId,
      currentExp: currentExp ?? giftTarget.currentExp,
      targetExp: targetExp ?? giftTarget.targetExp,
      gifts: gifts ? normalizeTargetGifts(gifts) : giftTarget.gifts,
    };

    if (typeof giftBoxCount === "number") {
      Object.assign(patch, normalizeGiftBoxCount(giftBoxCount));
    }

    await ctx.db.patch(id, patch);
  },
});

export const destroyInventory = authenticatedMutation({
  args: {
    id: v.id("giftInventory"),
  },
  handler: async (ctx, { id }) => {
    const giftInventory = await ctx.db.get(id);

    if (!giftInventory || giftInventory.userId !== ctx.user._id) {
      throw new Error("Gift Inventory not found");
    }

    const giftTargets = await ctx.db
      .query("giftTarget")
      .withIndex("by_giftInventory", (q) => q.eq("giftInventoryId", id))
      .collect();

    for (const target of giftTargets) {
      await ctx.db.delete(target._id);
    }

    await ctx.db.delete(id);
  },
});

export const destroyTarget = authenticatedMutation({
  args: {
    id: v.id("giftTarget"),
  },
  handler: async (ctx, { id }) => {
    const giftTarget = await ctx.db.get(id);

    if (!giftTarget || giftTarget.userId !== ctx.user._id) {
      throw new Error("Gift Target not found");
    }

    await ctx.db.delete(id);
  },
});
