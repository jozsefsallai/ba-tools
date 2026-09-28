import type { UserJSON } from "@clerk/nextjs/server";
import { type Validator, v } from "convex/values";
import { type QueryCtx, internalMutation } from "./_generated/server";

type ClerkMetadata = {
  isSuperUser?: unknown;
};

type ClerkWebhookUser = UserJSON & {
  private_metadata?: ClerkMetadata | null;
};

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
    const clerkData = data as ClerkWebhookUser;
    const isSuperUserFromClerk =
      clerkData.public_metadata?.isSuperUser === true ||
      clerkData.private_metadata?.isSuperUser === true ||
      clerkData.unsafe_metadata?.isSuperUser === true;
    const user = await getUserByExternalId(ctx, data.id);
    const userAttributes = {
      externalId: data.id,
      username: data.username ?? data.id,
      avatar: data.image_url,
      name:
        data.first_name || data.last_name
          ? `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim()
          : undefined,
      isSuperUser: isSuperUserFromClerk,
    };

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
