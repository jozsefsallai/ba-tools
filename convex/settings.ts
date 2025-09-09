import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./lib/auth";

export const get = authenticatedQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .first();
  },
});

export const update = authenticatedMutation({
  args: {
    timelineVisualizer: v.optional(
      v.object({
        triggerAutoFocus: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        timelineVisualizer:
          args.timelineVisualizer ?? existing.timelineVisualizer,
      });
      return await ctx.db.get(existing._id);
    }

    return await ctx.db.insert("settings", {
      userId: ctx.user._id,
      timelineVisualizer: args.timelineVisualizer ?? {
        triggerAutoFocus: false,
      },
    });
  },
});
