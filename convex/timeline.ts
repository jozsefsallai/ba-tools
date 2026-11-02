import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { authenticatedMutation, authenticatedQuery } from "./lib/auth";
import { notFound } from "./lib/errors";
import { timelineArgs } from "./lib/validators";

export const getOwn = authenticatedQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("timeline")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .collect();
  },
});

export const getOwnPaginated = authenticatedQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("timeline")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const searchOwn = authenticatedQuery({
  args: {
    search: v.string(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("timeline")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .collect();
    const term = args.search.toLowerCase();
    return all.filter((item) => (item.name ?? "").toLowerCase().includes(term));
  },
});

export const create = authenticatedMutation({
  args: timelineArgs,
  handler: async (ctx, args) => {
    const timeline = {
      userId: ctx.user._id,
      name: args.name,
      description: args.description,
      visibility: args.visibility ?? "private",
      showCreator: args.showCreator ?? false,
      items: args.items,
      itemSpacing: args.itemSpacing,
      verticalSeparatorSize: args.verticalSeparatorSize,
      horizontalSeparatorSize: args.horizontalSeparatorSize,
      exportWithTransparentBackground: args.exportWithTransparentBackground,
      exportBackgroundColor: args.exportBackgroundColor,
      exportBackgroundOpacity: args.exportBackgroundOpacity,
    };

    const id = await ctx.db.insert("timeline", timeline);
    return await ctx.db.get(id);
  },
});

export const update = authenticatedMutation({
  args: {
    id: v.id("timeline"),
    ...timelineArgs,
  },
  handler: async (ctx, args) => {
    const timeline = {
      name: args.name,
      description: args.description,
      visibility: args.visibility ?? "private",
      showCreator: args.showCreator ?? false,
      items: args.items,
      itemSpacing: args.itemSpacing,
      verticalSeparatorSize: args.verticalSeparatorSize,
      horizontalSeparatorSize: args.horizontalSeparatorSize,
      exportWithTransparentBackground: args.exportWithTransparentBackground,
      exportBackgroundColor: args.exportBackgroundColor,
      exportBackgroundOpacity: args.exportBackgroundOpacity,
    };

    const current = await ctx.db.get(args.id);
    if (!current || current.userId !== ctx.user._id) {
      throw notFound("Timeline not found.");
    }

    await ctx.db.patch(current._id, timeline);
    return await ctx.db.get(current._id);
  },
});

export const destroy = authenticatedMutation({
  args: {
    id: v.id("timeline"),
  },
  handler: async (ctx, { id }) => {
    const current = await ctx.db.get(id);
    if (!current || current.userId !== ctx.user._id) {
      throw notFound("Timeline not found.");
    }

    await ctx.db.delete(id);
    return true;
  },
});

export const getOwnById = authenticatedQuery({
  args: {
    id: v.id("timeline"),
  },
  handler: async (ctx, { id }) => {
    const timeline = await ctx.db.get(id);
    if (!timeline || timeline.userId !== ctx.user._id) {
      throw notFound("Timeline not found");
    }

    return timeline;
  },
});

export const getById = query({
  args: {
    id: v.id("timeline"),
  },
  handler: async (ctx, { id }) => {
    const timeline = await ctx.db.get(id);
    if (!timeline) {
      throw notFound("Timeline not found");
    }

    const owner = await ctx.db.get(timeline.userId);

    const identity = await ctx.auth.getUserIdentity();

    if (timeline.visibility === "public") {
      if (timeline.showCreator && owner) {
        return {
          ...timeline,
          user: {
            name: owner.name,
            username: owner.username,
            avatar: owner.avatar,
          },
          isOwn: identity?.subject === owner.externalId,
        };
      }

      return {
        ...timeline,
        isOwn: identity?.subject === owner?.externalId,
      };
    }

    if (!owner || !identity || owner.externalId !== identity?.subject) {
      throw notFound("Timeline not found");
    }

    if (timeline.showCreator) {
      return {
        ...timeline,
        user: {
          name: owner.name,
          username: owner.username,
          avatar: owner.avatar,
        },
        isOwn: true,
      };
    }

    return {
      ...timeline,
      isOwn: true,
    };
  },
});
