import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const DUPLICATE_WINDOW_MS = 60_000;

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    const normalizedLimit = Math.max(
      1,
      Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT),
    );

    const donations = await ctx.db
      .query("donation")
      .withIndex("by_supportCreatedOn")
      .order("desc")
      .take(normalizedLimit);

    return donations.map((donation) => ({
      _id: donation._id,
      supporterName: donation.supporterName,
      amount: donation.amount,
      currency: donation.currency,
      numberOfCoffees: donation.numberOfCoffees,
      supportCreatedOn: donation.supportCreatedOn,
    }));
  },
});

export const recordDonation = internalMutation({
  args: {
    supporterName: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    numberOfCoffees: v.optional(v.number()),
    supportNote: v.optional(v.string()),
    supportCreatedOn: v.number(),
    bmcSupportId: v.optional(v.string()),
    rawEvent: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.bmcSupportId) {
      const existingByBmcId = await ctx.db
        .query("donation")
        .withIndex("by_bmcSupportId", (q) =>
          q.eq("bmcSupportId", args.bmcSupportId),
        )
        .unique();
      if (existingByBmcId) {
        return existingByBmcId._id;
      }
    }

    const lowerBound = args.supportCreatedOn - DUPLICATE_WINDOW_MS;
    const upperBound = args.supportCreatedOn + DUPLICATE_WINDOW_MS;
    const recentDonations = await ctx.db
      .query("donation")
      .withIndex("by_supportCreatedOn", (q) =>
        q
          .gte("supportCreatedOn", lowerBound)
          .lte("supportCreatedOn", upperBound),
      )
      .collect();

    const existingFallback = recentDonations.find((donation) => {
      return (
        (donation.supporterName ?? "") === (args.supporterName ?? "") &&
        donation.amount === args.amount &&
        donation.supportCreatedOn === args.supportCreatedOn
      );
    });

    if (existingFallback) {
      return existingFallback._id;
    }

    return await ctx.db.insert("donation", args);
  },
});
