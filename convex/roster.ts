import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./lib/auth";
import { query } from "~convex/server";
import { GAME_SERVERS } from "@/lib/types";
import { rosterItem } from "./schema";

export const getOwn = authenticatedQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("roster")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .collect();
  },
});

export const getOwnById = authenticatedQuery({
  args: {
    id: v.id("roster"),
  },
  handler: async (ctx, { id }) => {
    const roster = await ctx.db.get(id);

    if (!roster || roster.userId !== ctx.user._id) {
      throw new Error("Roster not found");
    }

    return roster;
  },
});

export const getByGameServerAndFriendCode = query({
  args: {
    gameServer: v.union(...GAME_SERVERS.map((level) => v.literal(level))),
    friendCode: v.string(),
  },
  handler: async (ctx, { gameServer, friendCode }) => {
    const roster = await ctx.db
      .query("roster")
      .withIndex("by_gameServerAndFriendCode", (q) =>
        q.eq("gameServer", gameServer).eq("friendCode", friendCode),
      )
      .unique();

    if (!roster) {
      throw new Error("Roster not found");
    }

    const identity = await ctx.auth.getUserIdentity();

    if (roster.visibility === "public") {
      return roster;
    }

    const user =
      identity &&
      (await ctx.db
        .query("users")
        .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
        .first());

    if (user && roster.userId === user._id) {
      return roster;
    }

    throw new Error("Roster not found");
  },
});

export const create = authenticatedMutation({
  args: {
    name: v.optional(v.string()),
    introduction: v.optional(v.string()),
    accountLevel: v.number(),
    studentRepId: v.optional(v.string()),
    visibility: v.union(v.literal("private"), v.literal("public")),
    gameServer: v.union(...GAME_SERVERS.map((level) => v.literal(level))),
    friendCode: v.string(),
  },
  handler: async (
    ctx,
    {
      name,
      introduction,
      accountLevel,
      studentRepId,
      visibility,
      gameServer,
      friendCode,
    },
  ) => {
    const existing = await ctx.db
      .query("roster")
      .withIndex("by_gameServerAndFriendCode", (q) =>
        q.eq("gameServer", gameServer).eq("friendCode", friendCode),
      )
      .unique();

    if (existing) {
      throw new Error(
        "A roster with this game server and friend code already exists.",
      );
    }

    const id = await ctx.db.insert("roster", {
      userId: ctx.user._id,
      name,
      introduction,
      accountLevel,
      studentRepId,
      visibility,
      gameServer,
      friendCode,
      students: [],
      lastUpdated: Date.now(),
    });

    return id;
  },
});

export const update = authenticatedMutation({
  args: {
    id: v.id("roster"),
    name: v.optional(v.string()),
    introduction: v.optional(v.string()),
    accountLevel: v.optional(v.number()),
    studentRepId: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
    gameServer: v.optional(
      v.union(...GAME_SERVERS.map((level) => v.literal(level))),
    ),
    friendCode: v.optional(v.string()),
    students: v.optional(v.array(rosterItem)),
  },
  handler: async (
    ctx,
    {
      id,
      name,
      introduction,
      accountLevel,
      studentRepId,
      visibility,
      gameServer,
      friendCode,
      students,
    },
  ) => {
    const roster = await ctx.db.get(id);

    if (!roster || roster.userId !== ctx.user._id) {
      throw new Error("Roster not found");
    }

    if (gameServer && friendCode) {
      const existing = await ctx.db
        .query("roster")
        .withIndex("by_gameServerAndFriendCode", (q) =>
          q.eq("gameServer", gameServer).eq("friendCode", friendCode),
        )
        .unique();

      if (existing && existing._id !== id) {
        throw new Error(
          "A roster with this game server and friend code already exists.",
        );
      }
    }

    await ctx.db.patch(id, {
      name,
      introduction,
      accountLevel,
      studentRepId,
      visibility,
      gameServer,
      friendCode,
      students,
      lastUpdated: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

export const destroy = authenticatedMutation({
  args: {
    id: v.id("roster"),
  },
  handler: async (ctx, { id }) => {
    const roster = await ctx.db.get(id);
    if (!roster || roster.userId !== ctx.user._id) {
      throw new Error("Roster not found");
    }

    await ctx.db.delete(id);
    return true;
  },
});
