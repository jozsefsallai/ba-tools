import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { matchesRaidFilters } from "@/lib/raid-info";
import type { Id } from "~convex/dataModel";
import type { MutationCtx } from "~convex/server";
import { query } from "./_generated/server";
import { authenticatedMutation, authenticatedQuery } from "./lib/auth";
import { notFound } from "./lib/errors";
import { assertValidRaid } from "./lib/raid";
import { raidFilters, timelineArgs } from "./lib/validators";

async function assertFormationLinkAllowed(
  ctx: MutationCtx,
  userId: Id<"users">,
  formationId: Id<"formation"> | undefined,
) {
  if (!formationId) {
    return;
  }

  const formation = await ctx.db.get(formationId);
  if (formation && formation.userId !== userId) {
    throw notFound("Formation not found");
  }
}

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
    search: v.optional(v.string()),
    filters: v.optional(raidFilters),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("timeline")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .collect();
    const term = (args.search ?? "").toLowerCase();
    return all.filter(
      (item) =>
        (item.name ?? "").toLowerCase().includes(term) &&
        matchesRaidFilters(item.raid, args.filters ?? {}),
    );
  },
});

export const create = authenticatedMutation({
  args: timelineArgs,
  handler: async (ctx, args) => {
    await assertFormationLinkAllowed(ctx, ctx.user._id, args.formationId);
    assertValidRaid(args.raid, "timeline");

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
      formation: args.formation,
      formationId: args.formationId,
      exportIncludeFormation: args.exportIncludeFormation,
      raid: args.raid ?? undefined,
      autoName: args.autoName,
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
    await assertFormationLinkAllowed(ctx, ctx.user._id, args.formationId);
    assertValidRaid(args.raid, "timeline");

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
      formation: args.formation,
      formationId: args.formationId,
      exportIncludeFormation: args.exportIncludeFormation,
      raid: args.raid ?? undefined,
      autoName: args.autoName,
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
      const isOwn = identity?.subject === owner?.externalId;

      // The link points at a private formation, so only the owner gets it.
      const { formationId, ...publicTimeline } = timeline;
      const visibleTimeline = isOwn ? timeline : publicTimeline;

      if (timeline.showCreator && owner) {
        return {
          ...visibleTimeline,
          user: {
            name: owner.name,
            username: owner.username,
            avatar: owner.avatar,
          },
          isOwn,
        };
      }

      return {
        ...visibleTimeline,
        isOwn,
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
