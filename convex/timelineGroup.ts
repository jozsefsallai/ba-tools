import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
  inferGroupRaid,
  matchesRaidFilters,
  resolveGroupRaid,
} from "@/lib/raid-info";
import type { Doc } from "~convex/dataModel";
import type { QueryCtx } from "~convex/server";
import { query } from "~convex/server";
import { authenticatedMutation, authenticatedQuery } from "./lib/auth";
import { notFound } from "./lib/errors";
import { assertValidRaid } from "./lib/raid";
import {
  raidFilters,
  timelineGroupCreateArgs,
  timelineGroupUpdateArgs,
} from "./lib/validators";

const CARD_PREVIEW_STUDENTS = 8;

function getPreviewStudentIds(timelines: Doc<"timeline">[]) {
  const ids = new Set<string>();

  for (const timeline of timelines) {
    for (const row of timeline.formation?.rows ?? []) {
      for (const slot of [
        ...row.strikers,
        ...row.specials,
        ...(row.tcs ?? []),
      ]) {
        if (slot.studentId) {
          ids.add(slot.studentId);
        }
      }
    }

    for (const item of timeline.items) {
      if (item.type === "student") {
        ids.add(item.studentId);
      }
    }
  }

  return Array.from(ids).slice(0, CARD_PREVIEW_STUDENTS);
}

async function toGroupCard(ctx: QueryCtx, group: Doc<"timelineGroup">) {
  const docs = await Promise.all(group.timelines.map((id) => ctx.db.get(id)));
  const timelines = docs.filter((doc) => doc !== null);

  return {
    ...group,
    resolvedRaid: resolveGroupRaid(
      group.raid,
      inferGroupRaid(timelines.map((timeline) => timeline.raid)),
    ),
    timelineCount: timelines.length,
    previewStudentIds: getPreviewStudentIds(timelines),
  };
}

export const getOwn = authenticatedQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("timelineGroup")
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
      .query("timelineGroup")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const listOwnCards = authenticatedQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("timelineGroup")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: await Promise.all(
        result.page.map((group) => toGroupCard(ctx, group)),
      ),
    };
  },
});

export const searchOwn = authenticatedQuery({
  args: {
    search: v.optional(v.string()),
    filters: v.optional(raidFilters),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("timelineGroup")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .collect();
    const term = (args.search ?? "").toLowerCase();
    const matching = all.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        (item.description ?? "").toLowerCase().includes(term),
    );
    const cards = await Promise.all(
      matching.map((group) => toGroupCard(ctx, group)),
    );

    return cards.filter((card) =>
      matchesRaidFilters(card.resolvedRaid, args.filters ?? {}),
    );
  },
});

export const getOwnById = authenticatedQuery({
  args: {
    id: v.id("timelineGroup"),
  },
  handler: async (ctx, { id }) => {
    const timelineGroup = await ctx.db.get(id);

    if (!timelineGroup || timelineGroup.userId !== ctx.user._id) {
      throw notFound("Timeline group not found");
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
      inferredRaid: inferGroupRaid(timelines.map((t) => t.raid)),
    };
  },
});

export const getById = query({
  args: {
    id: v.id("timelineGroup"),
  },
  handler: async (ctx, { id }) => {
    const timelineGroup = await ctx.db.get(id);
    if (!timelineGroup) {
      throw notFound("Timeline group not found");
    }

    const owner = await ctx.db.get(timelineGroup.userId);
    const timelines = [];

    for (const timeline of timelineGroup.timelines) {
      const t = await ctx.db.get(timeline);
      if (t && t.visibility === "public") {
        // The link points at a private formation, so it isn't shared here.
        const { formationId: _formationId, ...publicTimeline } = t;
        timelines.push(publicTimeline);
      }
    }

    const identity = await ctx.auth.getUserIdentity();

    const inferredRaid = inferGroupRaid(timelines.map((t) => t.raid));

    if (timelineGroup.visibility === "public") {
      if (timelineGroup.showCreator && owner) {
        return {
          ...timelineGroup,
          timelines,
          inferredRaid,
          user: {
            name: owner.name,
            username: owner.username,
            avatar: owner.avatar,
          },
          isOwn: identity?.subject === owner.externalId,
        };
      }

      return {
        ...timelineGroup,
        timelines,
        inferredRaid,
        isOwn: identity?.subject === owner?.externalId,
      };
    }

    if (!owner || !identity || owner.externalId !== identity?.subject) {
      throw notFound("Timeline group not found");
    }

    if (timelineGroup.showCreator) {
      return {
        ...timelineGroup,
        timelines,
        inferredRaid,
        user: {
          name: owner.name,
          username: owner.username,
          avatar: owner.avatar,
        },
        isOwn: true,
      };
    }

    return {
      ...timelineGroup,
      timelines,
      inferredRaid,
      isOwn: true,
    };
  },
});

export const create = authenticatedMutation({
  args: timelineGroupCreateArgs,
  handler: async (
    ctx,
    { name, description, visibility, showCreator, raid, autoName },
  ) => {
    assertValidRaid(raid, "group");

    const id = await ctx.db.insert("timelineGroup", {
      userId: ctx.user._id,
      name,
      description,
      visibility,
      showCreator,
      timelines: [],
      raid: raid ?? undefined,
      autoName,
    });

    return id;
  },
});

export const update = authenticatedMutation({
  args: {
    id: v.id("timelineGroup"),
    ...timelineGroupUpdateArgs,
  },
  handler: async (
    ctx,
    {
      id,
      name,
      description,
      visibility,
      showCreator,
      timelines,
      raid,
      autoName,
    },
  ) => {
    assertValidRaid(raid, "group");

    const timelineGroup = await ctx.db.get(id);
    if (!timelineGroup || timelineGroup.userId !== ctx.user._id) {
      throw notFound("Timeline group not found");
    }

    await ctx.db.patch(id, {
      name: name ?? timelineGroup.name,
      description: description ?? timelineGroup.description,
      visibility: visibility ?? timelineGroup.visibility,
      showCreator: showCreator ?? timelineGroup.showCreator,
      timelines: timelines ?? timelineGroup.timelines,
      // `null` clears the raid details; leaving them out keeps them.
      raid: raid === null ? undefined : (raid ?? timelineGroup.raid),
      autoName: autoName ?? timelineGroup.autoName,
    });
    return await ctx.db.get(id);
  },
});

export const destroy = authenticatedMutation({
  args: {
    id: v.id("timelineGroup"),
  },
  handler: async (ctx, { id }) => {
    const timelineGroup = await ctx.db.get(id);
    if (!timelineGroup || timelineGroup.userId !== ctx.user._id) {
      throw notFound("Timeline group not found");
    }

    await ctx.db.delete(id);
    return true;
  },
});
