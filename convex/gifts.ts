import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./lib/auth";

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
  },
  handler: async (ctx, { name, gifts }) => {
    const giftInventoryId = await ctx.db.insert("giftInventory", {
      userId: ctx.user._id,
      name,
      gifts: gifts ?? [],
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
    gifts: v.optional(
      v.array(
        v.object({
          id: v.number(),
          enabled: v.boolean(),
        }),
      ),
    ),
  },
  handler: async (
    ctx,
    { giftInventoryId, studentId, currentExp, targetExp, gifts },
  ) => {
    const giftInventory = await ctx.db.get(giftInventoryId);

    if (!giftInventory || giftInventory.userId !== ctx.user._id) {
      throw new Error("Gift Inventory not found");
    }

    const existing = await ctx.db
      .query("giftTarget")
      .withIndex("by_studentId", (q) => q.eq("studentId", studentId))
      .first();

    if (existing) {
      throw new Error("Gift Target for this student already exists");
    }

    const giftTargetId = await ctx.db.insert("giftTarget", {
      userId: ctx.user._id,
      giftInventoryId,
      studentId,
      currentExp: currentExp ?? 0,
      targetExp,
      gifts: gifts ?? [],
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
  },
  handler: async (ctx, { id, name, gifts }) => {
    const giftInventory = await ctx.db.get(id);

    if (!giftInventory || giftInventory.userId !== ctx.user._id) {
      throw new Error("Gift Inventory not found");
    }

    await ctx.db.patch(id, {
      name: name ?? giftInventory.name,
      gifts: [...giftInventory.gifts, ...(gifts ?? [])],
    });
  },
});

export const updateTarget = authenticatedMutation({
  args: {
    id: v.id("giftTarget"),
    studentId: v.optional(v.string()),
    currentExp: v.optional(v.number()),
    targetExp: v.optional(v.number()),
    gifts: v.optional(
      v.array(
        v.object({
          id: v.number(),
          enabled: v.boolean(),
        }),
      ),
    ),
  },
  handler: async (ctx, { id, studentId, currentExp, targetExp, gifts }) => {
    const giftTarget = await ctx.db.get(id);

    if (!giftTarget || giftTarget.userId !== ctx.user._id) {
      throw new Error("Gift Target not found");
    }

    await ctx.db.patch(id, {
      studentId: studentId ?? giftTarget.studentId,
      currentExp: currentExp ?? giftTarget.currentExp,
      targetExp: targetExp ?? giftTarget.targetExp,
      gifts: [...giftTarget.gifts, ...(gifts ?? [])],
    });
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
