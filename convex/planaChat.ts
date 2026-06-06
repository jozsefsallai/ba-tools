import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authenticatedMutation, authenticatedQuery } from "./lib/auth";
import { planaMessagePart } from "./schema";

const DEFAULT_LLM_CONTEXT_TURNS = 50;
const CHAT_TITLE_MAX_LENGTH = 60;

function deriveChatTitle(parts: { type: "text"; text: string }[]) {
  const text = parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim()
    .replace(/\s+/g, " ");

  if (!text) {
    return "New chat";
  }

  if (text.length <= CHAT_TITLE_MAX_LENGTH) {
    return text;
  }

  return `${text.slice(0, CHAT_TITLE_MAX_LENGTH - 1)}…`;
}

async function getOwnedChat(
  ctx: QueryCtx | MutationCtx,
  chatId: Id<"planaChat">,
  userId: Id<"users">,
) {
  const chat = await ctx.db.get(chatId);

  if (!chat || chat.userId !== userId) {
    throw new Error("Chat not found");
  }

  return chat;
}

async function getOwnedTurn(
  ctx: QueryCtx | MutationCtx,
  chatId: Id<"planaChat">,
  userId: Id<"users">,
  order: number,
) {
  const turn = await ctx.db
    .query("planaTurn")
    .withIndex("by_chatId_order", (q) =>
      q.eq("chatId", chatId).eq("order", order),
    )
    .first();

  if (!turn || turn.userId !== userId) {
    throw new Error("Turn not found");
  }

  return turn;
}

export const listChatsPaginated = authenticatedQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("planaChat")
      .withIndex("by_userId_updatedAt", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map(({ _id, title, updatedAt }) => ({
        _id,
        title,
        updatedAt,
      })),
    };
  },
});

export const listRecentChats = authenticatedQuery({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, { limit }) => {
    const chats = await ctx.db
      .query("planaChat")
      .withIndex("by_userId_updatedAt", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .take(limit + 1);

    return {
      chats: chats.slice(0, limit).map(({ _id, title, updatedAt }) => ({
        _id,
        title,
        updatedAt,
      })),
      hasMore: chats.length > limit,
    };
  },
});

export const getTurnsPaginated = authenticatedQuery({
  args: {
    chatId: v.id("planaChat"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { chatId, paginationOpts }) => {
    await getOwnedChat(ctx, chatId, ctx.user._id);

    return await ctx.db
      .query("planaTurn")
      .withIndex("by_chatId_order", (q) => q.eq("chatId", chatId))
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const getLlmContext = authenticatedQuery({
  args: {
    chatId: v.id("planaChat"),
    maxTurns: v.optional(v.number()),
  },
  handler: async (ctx, { chatId, maxTurns = DEFAULT_LLM_CONTEXT_TURNS }) => {
    await getOwnedChat(ctx, chatId, ctx.user._id);

    const allTurns = await ctx.db
      .query("planaTurn")
      .withIndex("by_chatId_order", (q) => q.eq("chatId", chatId))
      .order("asc")
      .collect();

    const turns =
      allTurns.length > maxTurns
        ? allTurns.slice(allTurns.length - maxTurns)
        : allTurns;

    const messages: {
      role: "user" | "assistant";
      parts: { type: "text"; text: string }[];
    }[] = [];

    for (const turn of turns) {
      messages.push({
        role: "user",
        parts: turn.userParts,
      });

      const variant = turn.assistantVariants[turn.selectedVariantIndex];

      if (variant) {
        messages.push({
          role: "assistant",
          parts: variant.parts,
        });
      }
    }

    return messages;
  },
});

export const createChatWithTurn = authenticatedMutation({
  args: {
    userClientId: v.string(),
    userParts: v.array(planaMessagePart),
  },
  handler: async (ctx, { userClientId, userParts }) => {
    const now = Date.now();
    const chatId = await ctx.db.insert("planaChat", {
      userId: ctx.user._id,
      title: deriveChatTitle(userParts),
      updatedAt: now,
    });

    await ctx.db.insert("planaTurn", {
      chatId,
      userId: ctx.user._id,
      order: 0,
      userClientId,
      userParts,
      selectedVariantIndex: 0,
      assistantVariants: [],
    });

    return chatId;
  },
});

export const appendTurn = authenticatedMutation({
  args: {
    chatId: v.id("planaChat"),
    userClientId: v.string(),
    userParts: v.array(planaMessagePart),
  },
  handler: async (ctx, { chatId, userClientId, userParts }) => {
    await getOwnedChat(ctx, chatId, ctx.user._id);

    const latestTurn = await ctx.db
      .query("planaTurn")
      .withIndex("by_chatId_order", (q) => q.eq("chatId", chatId))
      .order("desc")
      .first();

    const nextOrder = latestTurn ? latestTurn.order + 1 : 0;

    await ctx.db.insert("planaTurn", {
      chatId,
      userId: ctx.user._id,
      order: nextOrder,
      userClientId,
      userParts,
      selectedVariantIndex: 0,
      assistantVariants: [],
    });

    await ctx.db.patch(chatId, { updatedAt: Date.now() });

    return nextOrder;
  },
});

export const completeAssistantVariant = authenticatedMutation({
  args: {
    chatId: v.id("planaChat"),
    turnOrder: v.number(),
    clientId: v.string(),
    parts: v.array(planaMessagePart),
  },
  handler: async (ctx, { chatId, turnOrder, clientId, parts }) => {
    const turn = await getOwnedTurn(ctx, chatId, ctx.user._id, turnOrder);
    const nextVariant = {
      clientId,
      parts,
      createdAt: Date.now(),
    };
    const assistantVariants = [...turn.assistantVariants, nextVariant];
    const selectedVariantIndex = assistantVariants.length - 1;

    await ctx.db.patch(turn._id, {
      assistantVariants,
      selectedVariantIndex,
    });

    await ctx.db.patch(chatId, { updatedAt: Date.now() });
  },
});

export const selectVariant = authenticatedMutation({
  args: {
    chatId: v.id("planaChat"),
    turnOrder: v.number(),
    selectedVariantIndex: v.number(),
  },
  handler: async (ctx, { chatId, turnOrder, selectedVariantIndex }) => {
    const turn = await getOwnedTurn(ctx, chatId, ctx.user._id, turnOrder);

    if (
      selectedVariantIndex < 0 ||
      selectedVariantIndex >= turn.assistantVariants.length
    ) {
      throw new Error("Invalid variant index");
    }

    await ctx.db.patch(turn._id, { selectedVariantIndex });
  },
});

export const rewindFromTurn = authenticatedMutation({
  args: {
    chatId: v.id("planaChat"),
    fromOrder: v.number(),
  },
  handler: async (ctx, { chatId, fromOrder }) => {
    await getOwnedChat(ctx, chatId, ctx.user._id);

    const turnsToDelete = await ctx.db
      .query("planaTurn")
      .withIndex("by_chatId_order", (q) => q.eq("chatId", chatId))
      .filter((q) => q.gt(q.field("order"), fromOrder))
      .collect();

    for (const turn of turnsToDelete) {
      await ctx.db.delete(turn._id);
    }

    const keptTurn = await getOwnedTurn(ctx, chatId, ctx.user._id, fromOrder);
    const trimmedVariants = keptTurn.assistantVariants.slice(
      0,
      keptTurn.selectedVariantIndex + 1,
    );

    await ctx.db.patch(keptTurn._id, {
      assistantVariants: trimmedVariants,
    });

    await ctx.db.patch(chatId, { updatedAt: Date.now() });
  },
});

export const deleteChat = authenticatedMutation({
  args: {
    chatId: v.id("planaChat"),
  },
  handler: async (ctx, { chatId }) => {
    await getOwnedChat(ctx, chatId, ctx.user._id);

    const turns = await ctx.db
      .query("planaTurn")
      .withIndex("by_chatId_order", (q) => q.eq("chatId", chatId))
      .collect();

    for (const turn of turns) {
      await ctx.db.delete(turn._id);
    }

    await ctx.db.delete(chatId);
  },
});

export const renameChat = authenticatedMutation({
  args: {
    chatId: v.id("planaChat"),
    title: v.string(),
  },
  handler: async (ctx, { chatId, title }) => {
    await getOwnedChat(ctx, chatId, ctx.user._id);

    const trimmed = title.trim().replace(/\s+/g, " ");

    if (!trimmed) {
      throw new Error("Title cannot be empty");
    }

    const nextTitle =
      trimmed.length <= CHAT_TITLE_MAX_LENGTH
        ? trimmed
        : `${trimmed.slice(0, CHAT_TITLE_MAX_LENGTH - 1)}…`;

    await ctx.db.patch(chatId, { title: nextTitle });
  },
});
