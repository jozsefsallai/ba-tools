import { v, type Validator } from "convex/values";
import type { UserJSON } from "@clerk/nextjs/server";
import { internalMutation, type QueryCtx } from "./_generated/server";

async function getUserByExternalId(ctx: QueryCtx, externalId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
    .unique();
}

export const upsertFromClerk = internalMutation({
  args: {
    data: v.any() as Validator<UserJSON>,
  },
  async handler(ctx, { data }) {
    const userAttributes = {
      externalId: data.id,
      username: data.username ?? data.id,
      avatar: data.image_url,
      name:
        data.first_name || data.last_name
          ? `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim()
          : undefined,
    };

    const user = await getUserByExternalId(ctx, data.id);
    if (!user) {
      await ctx.db.insert("users", userAttributes);
    } else {
      await ctx.db.patch(user._id, userAttributes);
    }
  },
});

export const deleteFromClerk = internalMutation({
  args: {
    externalId: v.string(),
  },
  async handler(ctx, { externalId }) {
    const user = await getUserByExternalId(ctx, externalId);
    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});
