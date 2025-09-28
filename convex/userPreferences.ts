import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./lib/auth";
import { defaultUserPreferences } from "@/lib/user-preferences";

export const get = authenticatedQuery({
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .first();

    if (existing) {
      return existing;
    }

    return defaultUserPreferences;
  },
});

export const update = authenticatedMutation({
  args: {
    timelineVisualizer: v.optional(
      v.object({
        triggerAutoFocus: v.optional(v.boolean()),
        defaultScale: v.optional(v.number()),
        defaultItemSpacing: v.optional(v.number()),
        defaultVerticalSeparatorSize: v.optional(v.number()),
        defaultHorizontalSeparatorSize: v.optional(v.number()),
      }),
    ),
    formationDisplay: v.optional(
      v.object({
        defaultScale: v.optional(v.number()),
        defaultDisplayOverline: v.optional(v.boolean()),
        defaultNoDisplayRole: v.optional(v.boolean()),
        defaultGroupsVertical: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        timelineVisualizer: {
          ...existing.timelineVisualizer,
          ...args.timelineVisualizer,
        },
        formationDisplay: {
          ...existing.formationDisplay,
          ...args.formationDisplay,
        },
      });

      return await ctx.db.get(existing._id);
    }

    return await ctx.db.insert("userPreferences", {
      userId: ctx.user._id,
      timelineVisualizer: {
        ...defaultUserPreferences.timelineVisualizer,
        ...args.timelineVisualizer,
      },
      formationDisplay: {
        ...defaultUserPreferences.formationDisplay,
        ...args.formationDisplay,
      },
    });
  },
});
