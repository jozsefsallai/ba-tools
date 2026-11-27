import type { UserJSON } from "@clerk/nextjs/server";
import { type Validator, v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  type QueryCtx,
} from "./_generated/server";
import { authenticatedQuery } from "./lib/auth";
import { acceptNames, displayNameOf } from "./lib/userName";

const GOOGLE_FILL_IN_WINDOW_MS = 2 * 60 * 1000;

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

type ExternalAccountTimes = {
  created_at?: number;
  updated_at?: number;
};

function isGoogleFillInMoment(data: UserJSON) {
  const isRecent = (time: number | null | undefined) =>
    typeof time === "number" &&
    Math.abs(data.updated_at - time) <= GOOGLE_FILL_IN_WINDOW_MS;

  return (
    isRecent(data.last_sign_in_at) ||
    (data.external_accounts ?? []).some((account) => {
      const { created_at, updated_at } = account as typeof account &
        ExternalAccountTimes;

      return (
        account.provider === "oauth_google" &&
        (isRecent(created_at) || isRecent(updated_at))
      );
    })
  );
}

export const upsertFromClerk = internalMutation({
  args: {
    data: v.any() as Validator<UserJSON>,
  },
  async handler(ctx, { data }) {
    const clerkData = data as ClerkWebhookUser;
    const isSuperUserFromClerk =
      clerkData.public_metadata?.isSuperUser === true ||
      clerkData.private_metadata?.isSuperUser === true;
    const user = await getUserByExternalId(ctx, data.id);

    const current = {
      firstName: data.first_name?.trim() ?? "",
      lastName: data.last_name?.trim() ?? "",
    };

    const names = acceptNames({
      previous:
        user?.firstName !== undefined && user.lastName !== undefined
          ? {
              firstName: user.firstName,
              lastName: user.lastName,
            }
          : undefined,
      current: {
        ...current,
        externalAccounts: (data.external_accounts ?? []).map((account) => ({
          provider: account.provider,
          firstName: account.first_name,
          lastName: account.last_name,
        })),
      },
      googleFillIn: isGoogleFillInMoment(data),
    });

    const userAttributes = {
      externalId: data.id,
      username: data.username ?? data.id,
      avatar: data.image_url,
      name: displayNameOf(names),
      firstName: names.firstName,
      lastName: names.lastName,
      isSuperUser: isSuperUserFromClerk,
    };

    // Clear Google's names in Clerk too, so they don't show on the Account
    // page either. The update this sends comes back here and changes nothing.
    if (
      names.firstName !== current.firstName ||
      names.lastName !== current.lastName
    ) {
      await ctx.scheduler.runAfter(0, internal.users.setClerkNames, {
        externalId: data.id,
        ...names,
      });
    }

    if (!user) {
      await ctx.db.insert("users", userAttributes);
    } else {
      await ctx.db.patch(user._id, userAttributes);
    }
  },
});

export const setClerkNames = internalAction({
  args: {
    externalId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  async handler(_ctx, { externalId, firstName, lastName }) {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      console.error(
        "Missing CLERK_SECRET_KEY in Convex env; Google's names stay in Clerk",
      );
      return;
    }

    const response = await fetch(
      `https://api.clerk.com/v1/users/${encodeURIComponent(externalId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Couldn't update the names of ${externalId} in Clerk: ${response.status} ${await response.text()}`,
      );
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

export const getMe = authenticatedQuery({
  args: {},
  handler: async (ctx) => {
    const { _id, _creationTime, externalId, username, name, avatar } = ctx.user;
    return {
      _id,
      _creationTime,
      externalId,
      username,
      name,
      avatar,
    };
  },
});
