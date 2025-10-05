import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./lib/auth";
import {
  timelineSeparatorItem,
  timelineStudentItem,
  timelineTextItem,
} from "./schema";
import { query } from "./_generated/server";

export const getOwn = authenticatedQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("timeline")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .collect();
  },
});

export const create = authenticatedMutation({
  args: {
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
    showCreator: v.optional(v.boolean()),
    items: v.array(
      v.union(timelineStudentItem, timelineSeparatorItem, timelineTextItem),
    ),
    itemSpacing: v.optional(v.number()),
    verticalSeparatorSize: v.optional(v.number()),
    horizontalSeparatorSize: v.optional(v.number()),
  },
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
    };

    const id = await ctx.db.insert("timeline", timeline);
    return await ctx.db.get(id);
  },
});

export const update = authenticatedMutation({
  args: {
    id: v.id("timeline"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
    showCreator: v.optional(v.boolean()),
    items: v.array(
      v.union(timelineStudentItem, timelineSeparatorItem, timelineTextItem),
    ),
    itemSpacing: v.optional(v.number()),
    verticalSeparatorSize: v.optional(v.number()),
    horizontalSeparatorSize: v.optional(v.number()),
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
    };

    const current = await ctx.db.get(args.id);
    if (!current || current.userId !== ctx.user._id) {
      throw new Error("Timeline not found.");
    }

    await ctx.db.patch(current._id, timeline);
    return await ctx.db.get(current._id);
  },
});

export const destroy = authenticatedMutation({
  args: { id: v.id("timeline") },
  handler: async (ctx, { id }) => {
    const current = await ctx.db.get(id);
    if (!current || current.userId !== ctx.user._id) {
      throw new Error("Timeline not found.");
    }

    await ctx.db.delete(id);
    return true;
  },
});

export const getOwnById = authenticatedQuery({
  args: { id: v.id("timeline") },
  handler: async (ctx, { id }) => {
    const timeline = await ctx.db.get(id);
    if (!timeline || timeline.userId !== ctx.user._id) {
      throw new Error("Timeline not found");
    }

    return timeline;
  },
});

export const getById = query({
  args: { id: v.id("timeline") },
  handler: async (ctx, { id }) => {
    const timeline = await ctx.db.get(id);
    if (!timeline) {
      throw new Error("Timeline not found");
    }

    const owner = await ctx.db.get(timeline.userId);

    if (timeline.visibility === "public") {
      if (timeline.showCreator && owner) {
        return {
          ...timeline,
          user: {
            name: owner.name,
            username: owner.username,
            avatar: owner.avatar,
          },
        };
      }

      return timeline;
    }

    const identity = await ctx.auth.getUserIdentity();

    if (!owner || !identity || owner.externalId !== identity?.subject) {
      throw new Error("Timeline not found");
    }

    if (timeline.showCreator) {
      return {
        ...timeline,
        user: {
          name: owner.name,
          username: owner.username,
          avatar: owner.avatar,
        },
      };
    }

    return timeline;
  },
});
