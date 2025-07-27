import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./lib/auth";
import { formationStudentItem } from "./schema";

export const getOwn = authenticatedQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("formation")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .collect();
  },
});

export const create = authenticatedMutation({
  args: {
    name: v.optional(v.string()),
    strikers: v.array(formationStudentItem),
    specials: v.array(formationStudentItem),
    displayOverline: v.optional(v.boolean()),
    noDisplayRole: v.optional(v.boolean()),
    groupsVertical: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.name && (args.name.length < 1 || args.name.length > 100)) {
      throw new Error("Echelon name must be between 1 and 100 characters");
    }

    const formation = {
      userId: ctx.user._id,
      name: args.name,
      strikers: args.strikers,
      specials: args.specials,
      displayOverline: args.displayOverline ?? false,
      noDisplayRole: args.noDisplayRole ?? false,
      groupsVertical: args.groupsVertical ?? false,
    };

    const id = await ctx.db.insert("formation", formation);
    return await ctx.db.get(id);
  },
});

export const update = authenticatedMutation({
  args: {
    id: v.id("formation"),
    name: v.optional(v.string()),
    strikers: v.array(formationStudentItem),
    specials: v.array(formationStudentItem),
    displayOverline: v.optional(v.boolean()),
    noDisplayRole: v.optional(v.boolean()),
    groupsVertical: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.name && (args.name.length < 1 || args.name.length > 100)) {
      throw new Error("Echelon name must be between 1 and 100 characters");
    }

    const formation = {
      name: args.name,
      strikers: args.strikers,
      specials: args.specials,
      displayOverline: args.displayOverline ?? false,
      noDisplayRole: args.noDisplayRole ?? false,
      groupsVertical: args.groupsVertical ?? false,
    };

    const current = await ctx.db.get(args.id);
    if (!current || current.userId !== ctx.user._id) {
      throw new Error("Formation not found");
    }

    await ctx.db.patch(args.id, formation);
    return await ctx.db.get(args.id);
  },
});

export const destroy = authenticatedMutation({
  args: {
    id: v.id("formation"),
  },
  handler: async (ctx, args) => {
    const current = await ctx.db.get(args.id);
    if (!current || current.userId !== ctx.user._id) {
      throw new Error("Formation not found");
    }

    await ctx.db.delete(args.id);
    return true;
  },
});

export const getById = authenticatedQuery({
  args: { id: v.id("formation") },
  handler: async (ctx, { id }) => {
    const formation = await ctx.db.get(id);
    if (!formation || formation.userId !== ctx.user._id) {
      throw new Error("Formation not found");
    }
    return formation;
  },
});
