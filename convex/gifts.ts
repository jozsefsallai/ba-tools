import { v } from "convex/values";
import {
  clampBondExp,
  getRankProgress,
  MAX_BOND_RANK,
} from "@/lib/bond/progress";
import { favorTableMap } from "@/lib/favor-table";
import { authenticatedMutation, authenticatedQuery } from "./lib/auth";
import { conflict, invalid, notFound } from "./lib/errors";
import {
  giftInventoryArgs,
  giftTargetCreateArgs,
  giftTargetUpdateArgs,
} from "./lib/validators";

function normalizeTargetGifts(
  gifts: {
    id: number;
    count: number;
  }[],
) {
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

type CurrentExpInput = {
  currentExp?: number;
  currentRank?: number;
  currentRankExp?: number;
  addExp?: number;
};

function resolveCurrentExp(
  { currentExp, currentRank, currentRankExp, addExp }: CurrentExpInput,
  savedExp: number,
) {
  const byRank = currentRank !== undefined || currentRankExp !== undefined;
  const ways = [
    currentExp !== undefined,
    byRank,
    addExp !== undefined,
  ].filter(Boolean).length;

  if (ways > 1) {
    throw invalid(
      "Send only one of `currentExp`, `currentRank`/`currentRankExp` and `addExp`.",
    );
  }

  if (addExp !== undefined) {
    if (!Number.isSafeInteger(addExp)) {
      throw invalid("`addExp` must be a whole number.");
    }

    return clampBondExp(clampBondExp(savedExp) + addExp);
  }

  if (!byRank) {
    return currentExp ?? savedExp;
  }

  const rank = currentRank ?? getRankProgress(clampBondExp(savedExp)).rank;
  const rankExp = currentRankExp ?? 0;

  if (!Number.isInteger(rank) || rank < 1 || rank > MAX_BOND_RANK) {
    throw invalid(
      `\`currentRank\` must be a whole number from 1 to ${MAX_BOND_RANK}.`,
    );
  }

  const { totalExp, expToNextLevel } = favorTableMap[rank];
  const maxRankExp = rank === MAX_BOND_RANK ? 0 : expToNextLevel - 1;

  if (!Number.isInteger(rankExp) || rankExp < 0 || rankExp > maxRankExp) {
    throw invalid(
      `\`currentRankExp\` must be a whole number from 0 to ${maxRankExp} at rank ${rank}. Check that the rank is right.`,
    );
  }

  return totalExp + rankExp;
}

export const getOwn = authenticatedQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("giftInventory")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .collect();
  },
});

export const getOwnTargets = authenticatedQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("giftTarget")
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
      throw notFound("Gift Inventory not found");
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
  args: giftInventoryArgs,
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
    ...giftTargetCreateArgs,
  },
  handler: async (
    ctx,
    {
      giftInventoryId,
      studentId,
      targetExp,
      gifts,
      giftBoxCount,
      ...currentExpInput
    },
  ) => {
    const giftInventory = await ctx.db.get(giftInventoryId);

    if (!giftInventory || giftInventory.userId !== ctx.user._id) {
      throw notFound("Gift Inventory not found");
    }

    const existing = await ctx.db
      .query("giftTarget")
      .withIndex("by_giftInventory", (q) =>
        q.eq("giftInventoryId", giftInventoryId),
      )
      .filter((q) => q.eq(q.field("studentId"), studentId))
      .first();

    if (existing) {
      throw conflict("Gift Target for this student already exists");
    }

    const boxCount = giftBoxCount ?? 0;

    const giftTargetId = await ctx.db.insert("giftTarget", {
      userId: ctx.user._id,
      giftInventoryId,
      studentId,
      currentExp: resolveCurrentExp(currentExpInput, 0),
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
    ...giftInventoryArgs,
  },
  handler: async (ctx, { id, name, gifts, giftBoxes }) => {
    const giftInventory = await ctx.db.get(id);

    if (!giftInventory || giftInventory.userId !== ctx.user._id) {
      throw notFound("Gift Inventory not found");
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
    ...giftTargetUpdateArgs,
  },
  handler: async (
    ctx,
    { id, studentId, targetExp, gifts, giftBoxCount, ...currentExpInput },
  ) => {
    const giftTarget = await ctx.db.get(id);

    if (!giftTarget || giftTarget.userId !== ctx.user._id) {
      throw notFound("Gift Target not found");
    }

    if (studentId !== undefined && studentId !== giftTarget.studentId) {
      const existing = await ctx.db
        .query("giftTarget")
        .withIndex("by_giftInventory", (q) =>
          q.eq("giftInventoryId", giftTarget.giftInventoryId),
        )
        .filter((q) => q.eq(q.field("studentId"), studentId))
        .first();

      if (existing) {
        throw conflict("Gift Target for this student already exists");
      }
    }

    const patch: Record<string, unknown> = {
      studentId: studentId ?? giftTarget.studentId,
      currentExp: resolveCurrentExp(currentExpInput, giftTarget.currentExp),
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
      throw notFound("Gift Inventory not found");
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
      throw notFound("Gift Target not found");
    }

    await ctx.db.delete(id);
  },
});
