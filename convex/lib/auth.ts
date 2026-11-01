import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { v } from "convex/values";
import type { QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { forbidden, notFound, unauthorized } from "./errors";

// Optional credentials used by the public HTTP API (`/api/v1`).
const apiCredentialArgs = {
  apiSecret: v.optional(v.string()),
  apiUserExternalId: v.optional(v.string()),
};

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;

  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}

async function resolveExternalId(
  ctx: QueryCtx,
  credentials: { apiSecret?: string; apiUserExternalId?: string },
) {
  if (credentials.apiSecret === undefined) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw unauthorized("This operation requires authentication.");
    }

    return identity.subject;
  }

  const expected = process.env.PUBLIC_API_SECRET;

  if (
    !expected ||
    !credentials.apiUserExternalId ||
    !timingSafeEqual(credentials.apiSecret, expected)
  ) {
    throw unauthorized("Invalid API credentials.");
  }

  return credentials.apiUserExternalId;
}

async function getAuthenticatedUser(
  ctx: QueryCtx,
  credentials: { apiSecret?: string; apiUserExternalId?: string },
) {
  const externalId = await resolveExternalId(ctx, credentials);

  const user = await ctx.db
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
    .unique();

  if (!user) {
    throw notFound("User not found.");
  }

  return user;
}

export const authenticatedQuery = customQuery(query, {
  args: apiCredentialArgs,
  input: async (ctx, credentials) => {
    const user = await getAuthenticatedUser(ctx, credentials);
    return { ctx: { ...ctx, user }, args: {} };
  },
});

export const authenticatedMutation = customMutation(mutation, {
  args: apiCredentialArgs,
  input: async (ctx, credentials) => {
    const user = await getAuthenticatedUser(ctx, credentials);
    return { ctx: { ...ctx, user }, args: {} };
  },
});

export const staffMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const user = await getAuthenticatedUser(ctx, {});

    if (user.isSuperUser !== true) {
      throw forbidden("This operation requires staff access.");
    }

    return {
      ...ctx,
      user,
    };
  }),
);
