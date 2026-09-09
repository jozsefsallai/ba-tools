import { GAME_SERVERS } from "@/lib/types";
import { v } from "convex/values";
import {
  type RecruitmentKind,
  type RecruitmentSessionKind,
  applySessionToAggregates,
  calculateRecruitmentStats,
  emptyAccountAggregates,
  normalizeRecruitmentSession,
  toStoredSessionFields,
  validateRecruitmentSession,
} from "../src/lib/recruitment";
import { internalMutation } from "./_generated/server";
import { authenticatedMutation, authenticatedQuery } from "./lib/auth";

const pickupValidator = v.object({
  charge: v.number(),
  studentId: v.string(),
  kind: v.optional(v.union(v.literal("permanent"), v.literal("limited"))),
});

const sessionArgs = {
  name: v.string(),
  date: v.number(),
  isFestBanner: v.boolean(),
  permanentStartCharge: v.number(),
  limitedStartCharge: v.number(),
  permanentPulls: v.number(),
  limitedPulls: v.number(),
  pickupsObtained: v.array(pickupValidator),
  threeStarCount: v.number(),
  rebateTicketsUsed: v.number(),
};

function statsFor(session: Parameters<typeof normalizeRecruitmentSession>[0]) {
  return calculateRecruitmentStats(session);
}

function computedStatsFor(
  session: Parameters<typeof normalizeRecruitmentSession>[0],
) {
  const stats = statsFor(session);
  return {
    ...stats,
    pullsPerPU: stats.pullsPerPU ?? undefined,
    pullsPerThreeStar: stats.pullsPerThreeStar ?? undefined,
  };
}

function sessionTouchesKind(
  session: {
    kind: RecruitmentSessionKind;
    permanentPulls?: number;
    limitedPulls?: number;
    totalPulls: number;
  },
  kind: RecruitmentKind,
) {
  const input = normalizeRecruitmentSession({
    ...session,
    threeStarCount: 0,
    rebateTicketsFromPreviousSession: 0,
    pickupsObtained: [],
  });
  return kind === "permanent"
    ? input.permanentPulls > 0
    : input.limitedPulls > 0;
}

async function getLatestSession(
  ctx: { db: any },
  accountId: any,
  kind?: RecruitmentKind,
) {
  const sessions = (
    await ctx.db
      .query("recruitmentSession")
      .withIndex("by_recruitmentAccountId_date", (q: any) =>
        q.eq("recruitmentAccountId", accountId),
      )
      .order("desc")
      .collect()
  ).sort(
    (a: any, b: any) => b.date - a.date || b._creationTime - a._creationTime,
  );
  if (!kind) return sessions[0];
  return sessions.find((session: any) => sessionTouchesKind(session, kind));
}

async function assertAccount(
  ctx: { db: any; user: { _id: any } },
  accountId: any,
) {
  const account = await ctx.db.get(accountId);
  if (!account || account.userId !== ctx.user._id) {
    throw new Error("Recruitment account not found.");
  }
  return account;
}

async function assertSession(
  ctx: { db: any; user: { _id: any } },
  sessionId: any,
) {
  const session = await ctx.db.get(sessionId);
  if (!session || session.userId !== ctx.user._id) {
    throw new Error("Recruitment session not found.");
  }
  return session;
}

function storedStartCharge(
  session: any,
  kind: RecruitmentKind,
): number | undefined {
  if (kind === "permanent") {
    return (
      session.permanentStartCharge ??
      (session.kind === "limited" ? undefined : session.startCharge)
    );
  }
  return (
    session.limitedStartCharge ??
    (session.kind === "limited" ? session.startCharge : undefined)
  );
}

function poolStartCharge(
  session: any,
  kind: RecruitmentKind,
  previousEndCharge: number | undefined,
  preserve: boolean,
): number {
  const stored = storedStartCharge(session, kind);
  if (preserve) return stored ?? previousEndCharge ?? 0;
  if (previousEndCharge != null) return previousEndCharge;
  return stored ?? 0;
}

async function rebuildAccountAnalytics(
  ctx: { db: any },
  account: any,
  preserveStartChargeFor?: any,
) {
  const sessions = (
    await ctx.db
      .query("recruitmentSession")
      .withIndex("by_recruitmentAccountId_date", (q: any) =>
        q.eq("recruitmentAccountId", account._id),
      )
      .order("asc")
      .collect()
  ).sort(
    (a: any, b: any) => a.date - b.date || a._creationTime - b._creationTime,
  );

  let aggregates = emptyAccountAggregates();
  const previousByKind: Record<
    RecruitmentKind,
    { endCharge: number } | undefined
  > = {
    permanent: undefined,
    limited: undefined,
  };
  const latest: Record<RecruitmentKind, any> = {
    permanent: undefined,
    limited: undefined,
  };
  let previousRebateTickets: number | undefined;

  for (const session of sessions) {
    const preserve = session._id === preserveStartChargeFor;
    const permanentStartCharge = poolStartCharge(
      session,
      "permanent",
      previousByKind.permanent?.endCharge,
      preserve,
    );
    const limitedStartCharge = poolStartCharge(
      session,
      "limited",
      previousByKind.limited?.endCharge,
      preserve,
    );
    const rebateTicketsFromPreviousSession =
      previousRebateTickets ?? session.rebateTicketsFromPreviousSession;
    const input = normalizeRecruitmentSession({
      ...session,
      permanentStartCharge,
      limitedStartCharge,
      rebateTicketsFromPreviousSession,
    });
    let stats: ReturnType<typeof statsFor>;
    let computedStats: ReturnType<typeof computedStatsFor>;
    try {
      stats = statsFor(input);
      computedStats = computedStatsFor(input);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "Pickup charges must increase after each pickup." ||
          error.message ===
            "The first pickup charge must be higher than the starting charge.")
      ) {
        throw new Error(
          `Cannot recalculate "${session.name}": its recorded pickup charges are lower than the recalculated starting charge (${permanentStartCharge}/${limitedStartCharge}). Edit this session or adjust the earlier session so the pull history is consistent.`,
        );
      }
      throw error;
    }

    const stored = toStoredSessionFields(input);
    if (
      session.startCharge !== stored.startCharge ||
      session.kind !== stored.kind ||
      session.totalPulls !== stored.totalPulls ||
      session.permanentPulls !== stored.permanentPulls ||
      session.limitedPulls !== stored.limitedPulls ||
      session.permanentStartCharge !== stored.permanentStartCharge ||
      session.limitedStartCharge !== stored.limitedStartCharge ||
      session.rebateTicketsFromPreviousSession !==
        rebateTicketsFromPreviousSession ||
      JSON.stringify(session.pickupsObtained) !==
        JSON.stringify(stored.pickupsObtained) ||
      JSON.stringify(session.computedStats) !== JSON.stringify(computedStats)
    ) {
      await ctx.db.patch(session._id, {
        kind: stored.kind,
        startCharge: stored.startCharge,
        totalPulls: stored.totalPulls,
        permanentPulls: stored.permanentPulls,
        limitedPulls: stored.limitedPulls,
        permanentStartCharge: stored.permanentStartCharge,
        limitedStartCharge: stored.limitedStartCharge,
        pickupsObtained: stored.pickupsObtained,
        rebateTicketsFromPreviousSession,
        computedStats,
      });
    }

    aggregates = applySessionToAggregates(aggregates, input, stats, 1);
    if (input.permanentPulls > 0) {
      previousByKind.permanent = { endCharge: stats.permanentEndCharge };
      latest.permanent = session;
    }
    if (input.limitedPulls > 0) {
      previousByKind.limited = { endCharge: stats.limitedEndCharge };
      latest.limited = session;
    }
    previousRebateTickets = stats.remainingRebateTickets;
  }

  await ctx.db.patch(account._id, {
    aggregates,
    latestPermanentSessionId: latest.permanent?._id,
    latestLimitedSessionId: latest.limited?._id,
    permanentCharge: previousByKind.permanent?.endCharge ?? 0,
    limitedCharge: previousByKind.limited?.endCharge ?? 0,
  });
}

export const getOwnAccounts = authenticatedQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("recruitmentAccount")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .collect();
  },
});

export const getAccount = authenticatedQuery({
  args: { accountId: v.id("recruitmentAccount") },
  handler: async (ctx, { accountId }) => {
    const account = await assertAccount(ctx, accountId);
    const sessions = await ctx.db
      .query("recruitmentSession")
      .withIndex("by_recruitmentAccountId_date", (q) =>
        q.eq("recruitmentAccountId", accountId),
      )
      .order("desc")
      .collect();

    const ordered = sessions.sort(
      (a, b) => b.date - a.date || b._creationTime - a._creationTime,
    );
    const latestPermanent = ordered.find((session) =>
      sessionTouchesKind(session, "permanent"),
    );
    const latestLimited = ordered.find((session) =>
      sessionTouchesKind(session, "limited"),
    );

    return {
      account,
      sessions: ordered.map((session) => ({
        ...session,
        stats: session.computedStats ?? computedStatsFor(session),
        isLatest:
          session._id === latestPermanent?._id ||
          session._id === latestLimited?._id,
      })),
    };
  },
});

export const getSession = authenticatedQuery({
  args: { sessionId: v.id("recruitmentSession") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) return null;
    if (session.userId !== ctx.user._id) {
      throw new Error("Recruitment session not found.");
    }
    const latestPermanent = await getLatestSession(
      ctx,
      session.recruitmentAccountId,
      "permanent",
    );
    const latestLimited = await getLatestSession(
      ctx,
      session.recruitmentAccountId,
      "limited",
    );
    return {
      ...session,
      stats: session.computedStats ?? computedStatsFor(session),
      isLatest:
        latestPermanent?._id === session._id ||
        latestLimited?._id === session._id,
    };
  },
});

export const createAccount = authenticatedMutation({
  args: {
    name: v.string(),
    gameServer: v.union(...GAME_SERVERS.map((server) => v.literal(server))),
    permanentCharge: v.number(),
    limitedCharge: v.number(),
  },
  handler: async (
    ctx,
    { name, gameServer, permanentCharge, limitedCharge },
  ) => {
    if (
      !Number.isInteger(permanentCharge) ||
      permanentCharge < 0 ||
      permanentCharge > 200 ||
      !Number.isInteger(limitedCharge) ||
      limitedCharge < 0 ||
      limitedCharge > 200
    ) {
      throw new Error("Charge must be an integer from 0 to 200.");
    }
    return ctx.db.insert("recruitmentAccount", {
      userId: ctx.user._id,
      name,
      gameServer,
      permanentCharge,
      limitedCharge,
      aggregates: emptyAccountAggregates(),
    });
  },
});

export const updateAccount = authenticatedMutation({
  args: {
    accountId: v.id("recruitmentAccount"),
    name: v.string(),
    gameServer: v.union(...GAME_SERVERS.map((server) => v.literal(server))),
    permanentCharge: v.number(),
    limitedCharge: v.number(),
  },
  handler: async (
    ctx,
    { accountId, name, gameServer, permanentCharge, limitedCharge },
  ) => {
    await assertAccount(ctx, accountId);
    if (
      !Number.isInteger(permanentCharge) ||
      permanentCharge < 0 ||
      permanentCharge > 200 ||
      !Number.isInteger(limitedCharge) ||
      limitedCharge < 0 ||
      limitedCharge > 200
    ) {
      throw new Error("Charge must be an integer from 0 to 200.");
    }
    await ctx.db.patch(accountId, {
      name,
      gameServer,
      permanentCharge,
      limitedCharge,
    });
  },
});

export const createSession = authenticatedMutation({
  args: {
    recruitmentAccountId: v.id("recruitmentAccount"),
    ...sessionArgs,
  },
  handler: async (ctx, args) => {
    const account = await assertAccount(ctx, args.recruitmentAccountId);
    const laterSession = (
      await ctx.db
        .query("recruitmentSession")
        .withIndex("by_recruitmentAccountId_date", (q: any) =>
          q.eq("recruitmentAccountId", args.recruitmentAccountId),
        )
        .collect()
    ).find((session: any) => session.date > args.date);
    if (laterSession) {
      throw new Error(
        "Recruitment sessions must be created in chronological order.",
      );
    }
    const previous = await getLatestSession(ctx, args.recruitmentAccountId);
    const input = normalizeRecruitmentSession({
      permanentStartCharge: args.permanentStartCharge,
      limitedStartCharge: args.limitedStartCharge,
      permanentPulls: args.permanentPulls,
      limitedPulls: args.limitedPulls,
      threeStarCount: args.threeStarCount,
      rebateTicketsFromPreviousSession: previous
        ? statsFor(previous).remainingRebateTickets
        : 0,
      rebateTicketsUsed: args.rebateTicketsUsed,
      isFestBanner: args.isFestBanner,
      pickupsObtained: args.pickupsObtained,
    });
    validateRecruitmentSession(input);
    const stored = toStoredSessionFields(input);
    const session = {
      userId: ctx.user._id,
      recruitmentAccountId: args.recruitmentAccountId,
      name: args.name,
      date: args.date,
      ...stored,
    };
    const computedStats = computedStatsFor(input);
    const sessionId = await ctx.db.insert("recruitmentSession", {
      ...session,
      computedStats,
    });
    await rebuildAccountAnalytics(ctx, account, sessionId);
    return sessionId;
  },
});

export const updateSession = authenticatedMutation({
  args: {
    sessionId: v.id("recruitmentSession"),
    ...sessionArgs,
  },
  handler: async (ctx, args) => {
    const session = await assertSession(ctx, args.sessionId);
    const input = normalizeRecruitmentSession({
      ...session,
      permanentStartCharge: args.permanentStartCharge,
      limitedStartCharge: args.limitedStartCharge,
      permanentPulls: args.permanentPulls,
      limitedPulls: args.limitedPulls,
      threeStarCount: args.threeStarCount,
      rebateTicketsUsed: args.rebateTicketsUsed,
      isFestBanner: args.isFestBanner,
      pickupsObtained: args.pickupsObtained,
    });
    validateRecruitmentSession(input);
    const stored = toStoredSessionFields(input);
    const computedStats = computedStatsFor(input);
    await ctx.db.patch(args.sessionId, {
      name: args.name,
      date: args.date,
      ...stored,
      computedStats,
    });
    const account = await assertAccount(ctx, session.recruitmentAccountId);
    await rebuildAccountAnalytics(ctx, account, session._id);
  },
});

export const deleteSession = authenticatedMutation({
  args: { sessionId: v.id("recruitmentSession") },
  handler: async (ctx, { sessionId }) => {
    const session = await assertSession(ctx, sessionId);
    const account = await assertAccount(ctx, session.recruitmentAccountId);
    await ctx.db.delete(sessionId);
    await rebuildAccountAnalytics(ctx, account);
  },
});

export const deleteAccount = authenticatedMutation({
  args: { accountId: v.id("recruitmentAccount") },
  handler: async (ctx, { accountId }) => {
    await assertAccount(ctx, accountId);
    const sessions = await ctx.db
      .query("recruitmentSession")
      .withIndex("by_recruitmentAccountId", (q) =>
        q.eq("recruitmentAccountId", accountId),
      )
      .collect();
    for (const session of sessions) await ctx.db.delete(session._id);
    await ctx.db.delete(accountId);
  },
});

export const backfillRecruitmentAnalytics = internalMutation({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("recruitmentAccount").collect();
    for (const account of accounts) {
      await rebuildAccountAnalytics(ctx, account);
    }
  },
});
