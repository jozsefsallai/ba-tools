import { v } from "convex/values";
import { isValidFriendCode } from "@/lib/friend-code";
import { GAME_SERVERS } from "@/lib/types";
import { query } from "~convex/server";
import { authenticatedMutation, authenticatedQuery } from "./lib/auth";
import { conflict, invalid, notFound } from "./lib/errors";
import { rosterCreateArgs, rosterUpdateArgs } from "./lib/validators";

function assertValidFriendCode(friendCode: string) {
  if (!isValidFriendCode(friendCode)) {
    throw invalid("Friend code must be exactly 8 uppercase letters (A–Z).");
  }
}

export const getOwn = authenticatedQuery({
  args: {},
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
      throw notFound("Roster not found");
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
    if (!isValidFriendCode(friendCode)) {
      throw notFound("Roster not found");
    }

    const roster = await ctx.db
      .query("roster")
      .withIndex("by_gameServerAndFriendCode", (q) =>
        q.eq("gameServer", gameServer).eq("friendCode", friendCode),
      )
      .unique();

    if (!roster) {
      throw notFound("Roster not found");
    }

    const identity = await ctx.auth.getUserIdentity();

    const user =
      identity &&
      (await ctx.db
        .query("users")
        .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
        .first());

    if (user && roster.userId === user._id) {
      return roster;
    }

    if (roster.visibility === "public") {
      const { userId: _userId, ...publicRoster } = roster;
      return publicRoster;
    }

    throw notFound("Roster not found");
  },
});

export const create = authenticatedMutation({
  args: rosterCreateArgs,
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
    assertValidFriendCode(friendCode);

    const existing = await ctx.db
      .query("roster")
      .withIndex("by_gameServerAndFriendCode", (q) =>
        q.eq("gameServer", gameServer).eq("friendCode", friendCode),
      )
      .unique();

    if (existing) {
      throw conflict(
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
    ...rosterUpdateArgs,
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
      throw notFound("Roster not found");
    }

    if (friendCode !== undefined) {
      assertValidFriendCode(friendCode);
    }

    if (gameServer && friendCode) {
      const existing = await ctx.db
        .query("roster")
        .withIndex("by_gameServerAndFriendCode", (q) =>
          q.eq("gameServer", gameServer).eq("friendCode", friendCode),
        )
        .unique();

      if (existing && existing._id !== id) {
        throw conflict(
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
      throw notFound("Roster not found");
    }

    await ctx.db.delete(id);
    return true;
  },
});
