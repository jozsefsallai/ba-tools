import { query } from "~convex/server";
import { authenticatedMutation, authenticatedQuery } from "./lib/auth";
import { v } from "convex/values";

export const getOwn = authenticatedQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("timelineGroup")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .collect();
  },
});

export const getOwnById = authenticatedQuery({
  args: { id: v.id("timelineGroup") },
  handler: async (ctx, { id }) => {
    const timelineGroup = await ctx.db.get(id);

    if (!timelineGroup || timelineGroup.userId !== ctx.user._id) {
      throw new Error("Timeline group not found");
    }

    const timelines = [];
    for (const timeline of timelineGroup.timelines) {
      const t = await ctx.db.get(timeline);
      if (t) {
        timelines.push(t);
      }
    }

    return {
      ...timelineGroup,
      timelines,
    };
  },
});

export const getById = query({
  args: { id: v.id("timelineGroup") },
  handler: async (ctx, { id }) => {
    const timelineGroup = await ctx.db.get(id);
    if (!timelineGroup) {
      throw new Error("Timeline group not found");
    }

    const owner = await ctx.db.get(timelineGroup.userId);
    const timelines = [];

    for (const timeline of timelineGroup.timelines) {
      const t = await ctx.db.get(timeline);
      if (t && t.visibility === "public") {
        timelines.push(t);
      }
    }

    if (timelineGroup.visibility === "public") {
      if (timelineGroup.showCreator && owner) {
        return {
          ...timelineGroup,
          timelines,
          user: {
            name: owner.name,
            username: owner.username,
            avatar: owner.avatar,
          },
        };
      }

      return {
        ...timelineGroup,
        timelines,
      };
    }

    const identity = await ctx.auth.getUserIdentity();

    if (!owner || !identity || owner.externalId !== identity?.subject) {
      throw new Error("Timeline group not found");
    }

    if (timelineGroup.showCreator) {
      return {
        ...timelineGroup,
        timelines,
        user: {
          name: owner.name,
          username: owner.username,
          avatar: owner.avatar,
        },
      };
    }

    return {
      ...timelineGroup,
      timelines,
    };
  },
});

export const create = authenticatedMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    visibility: v.union(v.literal("private"), v.literal("public")),
    showCreator: v.optional(v.boolean()),
  },
  handler: async (ctx, { name, description, visibility, showCreator }) => {
    const id = await ctx.db.insert("timelineGroup", {
      userId: ctx.user._id,
      name,
      description,
      visibility,
      showCreator,
      timelines: [],
    });

    return id;
  },
});

export const update = authenticatedMutation({
  args: {
    id: v.id("timelineGroup"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
    showCreator: v.optional(v.boolean()),
    timelines: v.optional(v.array(v.id("timeline"))),
  },
  handler: async (
    ctx,
    { id, name, description, visibility, showCreator, timelines },
  ) => {
    const timelineGroup = await ctx.db.get(id);
    if (!timelineGroup || timelineGroup.userId !== ctx.user._id) {
      throw new Error("Timeline group not found");
    }

    await ctx.db.patch(id, {
      name: name ?? timelineGroup.name,
      description: description ?? timelineGroup.description,
      visibility: visibility ?? timelineGroup.visibility,
      showCreator: showCreator ?? timelineGroup.showCreator,
      timelines: timelines ?? timelineGroup.timelines,
    });
    return await ctx.db.get(id);
  },
});

export const destroy = authenticatedMutation({
  args: { id: v.id("timelineGroup") },
  handler: async (ctx, { id }) => {
    const timelineGroup = await ctx.db.get(id);
    if (!timelineGroup || timelineGroup.userId !== ctx.user._id) {
      throw new Error("Timeline group not found");
    }

    await ctx.db.delete(id);
    return true;
  },
});
