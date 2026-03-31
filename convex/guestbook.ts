import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_NAME = 48;
const MAX_MESSAGE = 180;
const MIN_MESSAGE = 2;
const MIN_NAME = 1;

const TOKEN_MIN_LEN = 8;
const TOKEN_MAX_LEN = 128;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("guestbookEntries").collect();
    rows.sort((a, b) => b._creationTime - a._creationTime);
    return rows.slice(0, 50).map((r) => ({
      _id: r._id,
      _creationTime: r._creationTime,
      name: r.name,
      message: r.message,
    }));
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const trimmed = token.trim();
    if (trimmed.length < TOKEN_MIN_LEN || trimmed.length > TOKEN_MAX_LEN) {
      return null;
    }

    const row = await ctx.db
      .query("guestbookEntries")
      .withIndex("by_submitterToken", (q) => q.eq("submitterToken", trimmed))
      .first();

    if (!row) {
      return null;
    }

    return {
      _id: row._id,
      name: row.name,
      message: row.message,
      _creationTime: row._creationTime,
    };
  },
});

export const submit = mutation({
  args: {
    name: v.string(),
    message: v.string(),
    submitterToken: v.string(),
  },
  handler: async (ctx, { name, message, submitterToken }) => {
    const trimmedName = name.trim().slice(0, MAX_NAME);
    const trimmedMessage = message.trim().slice(0, MAX_MESSAGE);
    const token = submitterToken.trim();

    if (trimmedName.length < MIN_NAME || trimmedMessage.length < MIN_MESSAGE) {
      throw new ConvexError("VALIDATION");
    }

    if (token.length < TOKEN_MIN_LEN || token.length > TOKEN_MAX_LEN) {
      throw new ConvexError("INVALID_TOKEN");
    }

    const existing = await ctx.db
      .query("guestbookEntries")
      .withIndex("by_submitterToken", (q) => q.eq("submitterToken", token))
      .first();

    if (existing) {
      throw new ConvexError("ALREADY_SIGNED");
    }

    await ctx.db.insert("guestbookEntries", {
      name: trimmedName,
      message: trimmedMessage,
      submitterToken: token,
    });
  },
});
