import { defaultUserPreferences } from "@/lib/user-preferences";
import { authenticatedMutation, authenticatedQuery } from "./lib/auth";
import { userPreferencesArgs } from "./lib/validators";

export const get = authenticatedQuery({
  args: {},
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
  args: userPreferencesArgs,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        timelineVisualizer: {
          ...defaultUserPreferences.timelineVisualizer,
          ...existing.timelineVisualizer,
          ...args.timelineVisualizer,
        },
        formationDisplay: {
          ...existing.formationDisplay,
          ...args.formationDisplay,
        },
        bond: {
          ...(existing.bond ?? defaultUserPreferences.bond),
          ...args.bond,
        },
        pvp: {
          ...(existing.pvp ?? defaultUserPreferences.pvp),
          ...args.pvp,
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
      bond: {
        ...defaultUserPreferences.bond,
        ...args.bond,
      },
      pvp: {
        ...defaultUserPreferences.pvp,
        ...args.pvp,
      },
    });
  },
});
