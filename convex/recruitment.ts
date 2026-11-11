import { v } from "convex/values";
import {
  applySessionToAggregates,
  calculateRecruitmentStats,
  emptyAccountAggregates,
  HARD_PITY,
  normalizeRecruitmentSession,
  type RecruitmentKind,
  type RecruitmentSessionRecord,
  type RecruitmentStats,
  RecruitmentValidationError,
  toStoredSessionFields,
  validateRecruitmentSession,
} from "../src/lib/recruitment";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { authenticatedMutation, authenticatedQuery } from "./lib/auth";
import { invalid, notFound } from "./lib/errors";
import {
  recruitmentAccountArgs,
  recruitmentSessionArgs,
} from "./lib/validators";

type Account = Doc<"recruitmentAccount">;
type Session = Doc<"recruitmentSession">;

type UserCtx = QueryCtx & {
  user: Doc<"users">;
};

const KINDS: RecruitmentKind[] = [
  "permanent",
  "limited",
];

/** Runs a recruitment calculation, turning a broken rule into an `invalid` error. */
function asInvalid<T>(compute: () => T): T {
  try {
    return compute();
  } catch (error) {
    if (error instanceof RecruitmentValidationError) {
      throw invalid(error.message);
    }

    throw error;
  }
}

function normalizeSession(session: RecruitmentSessionRecord) {
  return asInvalid(() => normalizeRecruitmentSession(session));
}

function statsFor(session: RecruitmentSessionRecord) {
  return asInvalid(() => calculateRecruitmentStats(session));
}

/** Stats in the shape they are stored in, where a missing average is left out. */
function toComputedStats(stats: RecruitmentStats) {
  return {
    ...stats,
    pullsPerPU: stats.pullsPerPU ?? undefined,
    pullsPerThreeStar: stats.pullsPerThreeStar ?? undefined,
  };
}

function computedStatsFor(session: RecruitmentSessionRecord) {
  return toComputedStats(statsFor(session));
}

function sessionTouchesKind(
  session: Pick<
    Session,
    "kind" | "permanentPulls" | "limitedPulls" | "totalPulls"
  >,
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

/** The account's sessions by date, with same-day sessions in the order they were created. */
async function getSessions(
  ctx: QueryCtx,
  accountId: Id<"recruitmentAccount">,
  order: "asc" | "desc",
) {
  const sessions = await ctx.db
    .query("recruitmentSession")
    .withIndex("by_recruitmentAccountId_date", (q) =>
      q.eq("recruitmentAccountId", accountId),
    )
    .order(order)
    .collect();

  const direction = order === "asc" ? 1 : -1;

  return sessions.sort(
    (a, b) =>
      direction * (a.date - b.date || a._creationTime - b._creationTime),
  );
}

/** The ids of the latest session on each banner type, given sessions sorted newest first. */
function latestSessionIds(sessions: Session[]) {
  return new Set(
    KINDS.map(
      (kind) =>
        sessions.find((session) => sessionTouchesKind(session, kind))?._id,
    ),
  );
}

async function assertAccount(
  ctx: UserCtx,
  accountId: Id<"recruitmentAccount">,
) {
  const account = await ctx.db.get(accountId);

  if (!account || account.userId !== ctx.user._id) {
    throw notFound("Recruitment account not found.");
  }

  return account;
}

async function assertSession(
  ctx: UserCtx,
  sessionId: Id<"recruitmentSession">,
) {
  const session = await ctx.db.get(sessionId);

  if (!session || session.userId !== ctx.user._id) {
    throw notFound("Recruitment session not found.");
  }

  return session;
}

function assertValidCharges(...charges: number[]) {
  const valid = charges.every(
    (charge) => Number.isInteger(charge) && charge >= 0 && charge <= HARD_PITY,
  );

  if (!valid) {
    throw invalid("Charge must be an integer from 0 to 200.");
  }
}

function storedStartCharge(
  session: Session,
  kind: RecruitmentKind,
): number | undefined {
  const isLimited = session.kind === "limited";

  if (kind === "permanent") {
    return (
      session.permanentStartCharge ??
      (isLimited ? undefined : session.startCharge)
    );
  }

  return (
    session.limitedStartCharge ?? (isLimited ? session.startCharge : undefined)
  );
}

type PoolCharges = Partial<Record<RecruitmentKind, number>>;

/** The starting charges the session was saved with, for the banner types it pulled on. */
function savedStartCharges(session: Session): PoolCharges {
  const charges: PoolCharges = {};

  for (const kind of KINDS) {
    const charge = storedStartCharge(session, kind);

    if (charge !== undefined && sessionTouchesKind(session, kind)) {
      charges[kind] = charge;
    }
  }

  return charges;
}

type RebuildOptions = {
  /**
   * The session that was just saved. A starting charge on it that differs from
   * the previous session's ending charge was set by hand, and is kept as an
   * override from then on.
   */
  savedSessionId?: Id<"recruitmentSession">;
  /** The account's charge on a banner type that no session pulls on any more. */
  fallbackCharges?: PoolCharges;
};

/**
 * Replays the account's sessions in order, then stores the recalculated
 * sessions, the account's aggregates and its current charges.
 *
 * Each session starts from the rebate tickets the previous one ended with, and
 * from the previous ending charge on each banner type unless its starting
 * charge was set by hand.
 */
async function rebuildAccountAnalytics(
  ctx: MutationCtx,
  account: Account,
  { savedSessionId, fallbackCharges = {} }: RebuildOptions = {},
) {
  const sessions = await getSessions(ctx, account._id, "asc");

  let aggregates = emptyAccountAggregates();
  let previousRebateTickets: number | undefined;

  const endCharges: PoolCharges = {};
  const latest: Partial<Record<RecruitmentKind, Session>> = {};

  for (const session of sessions) {
    const saved = savedStartCharges(session);
    const overrides: PoolCharges = {};

    for (const kind of KINDS) {
      const override =
        session._id !== savedSessionId
          ? session.startChargeOverrides?.[kind]
          : endCharges[kind] !== undefined && saved[kind] !== endCharges[kind]
            ? saved[kind]
            : undefined;

      // Only a banner type the session pulls on can have an override.
      if (override !== undefined && saved[kind] !== undefined) {
        overrides[kind] = override;
      }
    }

    const startChargeOf = (kind: RecruitmentKind) =>
      overrides[kind] ??
      endCharges[kind] ??
      storedStartCharge(session, kind) ??
      0;

    const permanentStartCharge = startChargeOf("permanent");
    const limitedStartCharge = startChargeOf("limited");

    const rebateTicketsFromPreviousSession =
      previousRebateTickets ?? session.rebateTicketsFromPreviousSession;

    const input = normalizeSession({
      ...session,
      permanentStartCharge,
      limitedStartCharge,
      rebateTicketsFromPreviousSession,
    });

    let stats: RecruitmentStats;

    try {
      stats = calculateRecruitmentStats(input);
    } catch (error) {
      if (!(error instanceof RecruitmentValidationError)) {
        throw error;
      }

      const startsAboveFirstPickup =
        error.message === "Pickup charges must increase after each pickup." ||
        error.message ===
          "The first pickup charge must be higher than the starting charge.";

      throw invalid(
        startsAboveFirstPickup
          ? `Cannot recalculate "${session.name}": its recorded pickup charges are lower than the recalculated starting charge (${permanentStartCharge}/${limitedStartCharge}). Edit this session or adjust the earlier session so the pull history is consistent.`
          : error.message,
      );
    }

    const stored = toStoredSessionFields(input);

    const recalculated = {
      kind: stored.kind,
      startCharge: stored.startCharge,
      totalPulls: stored.totalPulls,
      permanentPulls: stored.permanentPulls,
      limitedPulls: stored.limitedPulls,
      permanentStartCharge: stored.permanentStartCharge,
      limitedStartCharge: stored.limitedStartCharge,
      startChargeOverrides:
        Object.keys(overrides).length > 0 ? overrides : undefined,
      pickupsObtained: stored.pickupsObtained,
      rebateTicketsFromPreviousSession,
      computedStats: toComputedStats(stats),
    };

    const changed = Object.entries(recalculated).some(
      ([field, value]) =>
        JSON.stringify(session[field as keyof typeof recalculated]) !==
        JSON.stringify(value),
    );

    if (changed) {
      await ctx.db.patch(session._id, recalculated);
    }

    aggregates = applySessionToAggregates(aggregates, input, stats, 1);
    previousRebateTickets = stats.remainingRebateTickets;

    if (input.permanentPulls > 0) {
      endCharges.permanent = stats.permanentEndCharge;
      latest.permanent = session;
    }

    if (input.limitedPulls > 0) {
      endCharges.limited = stats.limitedEndCharge;
      latest.limited = session;
    }
  }

  await ctx.db.patch(account._id, {
    aggregates,
    latestPermanentSessionId: latest.permanent?._id,
    latestLimitedSessionId: latest.limited?._id,
    permanentCharge:
      endCharges.permanent ??
      fallbackCharges.permanent ??
      account.permanentCharge,
    limitedCharge:
      endCharges.limited ?? fallbackCharges.limited ?? account.limitedCharge,
  });
}

export const getOwnAccounts = authenticatedQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("recruitmentAccount")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .collect();
  },
});

export const getAccount = authenticatedQuery({
  args: {
    accountId: v.id("recruitmentAccount"),
  },
  handler: async (ctx, { accountId }) => {
    const account = await assertAccount(ctx, accountId);
    const sessions = await getSessions(ctx, accountId, "desc");
    const latestIds = latestSessionIds(sessions);

    return {
      account,
      sessions: sessions.map((session) => ({
        ...session,
        stats: session.computedStats ?? computedStatsFor(session),
        isLatest: latestIds.has(session._id),
      })),
    };
  },
});

export const getSession = authenticatedQuery({
  args: {
    sessionId: v.id("recruitmentSession"),
  },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);

    if (!session) {
      return null;
    }

    if (session.userId !== ctx.user._id) {
      throw notFound("Recruitment session not found.");
    }

    const sessions = await getSessions(
      ctx,
      session.recruitmentAccountId,
      "desc",
    );

    return {
      ...session,
      stats: session.computedStats ?? computedStatsFor(session),
      isLatest: latestSessionIds(sessions).has(session._id),
    };
  },
});

export const createAccount = authenticatedMutation({
  args: recruitmentAccountArgs,
  handler: async (
    ctx,
    { name, gameServer, permanentCharge, limitedCharge },
  ) => {
    assertValidCharges(permanentCharge, limitedCharge);

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
    ...recruitmentAccountArgs,
  },
  handler: async (
    ctx,
    { accountId, name, gameServer, permanentCharge, limitedCharge },
  ) => {
    await assertAccount(ctx, accountId);
    assertValidCharges(permanentCharge, limitedCharge);

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
    ...recruitmentSessionArgs,
  },
  handler: async (ctx, args) => {
    const account = await assertAccount(ctx, args.recruitmentAccountId);
    const sessions = await getSessions(ctx, account._id, "desc");

    if (sessions.some((session) => session.date > args.date)) {
      throw invalid(
        "Recruitment sessions must be created in chronological order.",
      );
    }

    const previous = sessions.at(0);

    const input = normalizeSession({
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

    asInvalid(() => validateRecruitmentSession(input));

    const sessionId = await ctx.db.insert("recruitmentSession", {
      userId: ctx.user._id,
      recruitmentAccountId: account._id,
      name: args.name,
      date: args.date,
      ...toStoredSessionFields(input),
      computedStats: computedStatsFor(input),
    });

    await rebuildAccountAnalytics(ctx, account, {
      savedSessionId: sessionId,
    });

    return sessionId;
  },
});

export const updateSession = authenticatedMutation({
  args: {
    sessionId: v.id("recruitmentSession"),
    ...recruitmentSessionArgs,
  },
  handler: async (ctx, args) => {
    const session = await assertSession(ctx, args.sessionId);

    const input = normalizeSession({
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

    asInvalid(() => validateRecruitmentSession(input));

    await ctx.db.patch(session._id, {
      name: args.name,
      date: args.date,
      ...toStoredSessionFields(input),
      computedStats: computedStatsFor(input),
    });

    const account = await assertAccount(ctx, session.recruitmentAccountId);
    await rebuildAccountAnalytics(ctx, account, {
      savedSessionId: session._id,
      fallbackCharges: savedStartCharges(session),
    });
  },
});

export const deleteSession = authenticatedMutation({
  args: {
    sessionId: v.id("recruitmentSession"),
  },
  handler: async (ctx, { sessionId }) => {
    const session = await assertSession(ctx, sessionId);
    const account = await assertAccount(ctx, session.recruitmentAccountId);

    await ctx.db.delete(sessionId);

    await rebuildAccountAnalytics(ctx, account, {
      fallbackCharges: savedStartCharges(session),
    });
  },
});

export const deleteAccount = authenticatedMutation({
  args: {
    accountId: v.id("recruitmentAccount"),
  },
  handler: async (ctx, { accountId }) => {
    await assertAccount(ctx, accountId);

    const sessions = await ctx.db
      .query("recruitmentSession")
      .withIndex("by_recruitmentAccountId", (q) =>
        q.eq("recruitmentAccountId", accountId),
      )
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

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
