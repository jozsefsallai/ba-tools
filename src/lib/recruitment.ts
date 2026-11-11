export const REBATE_MILESTONES = [
  70,
  130,
  150,
  170,
  270,
  330,
  350,
  370,
] as const;

export const SOFT_PITY = 100;
export const HARD_PITY = 200;
export const PYROXENE_COST = 120;

export const RECRUITMENT_COLORS = {
  base: {
    accent: "#0ebaf2",
    trackAccent: "#63e3ff",
    labelBorderActive: "#36cdff",
    labelTextActive: "#2b8bb5",
  },
  limited: {
    accent: "#fc54da",
    trackAccent: "#ff8ae5",
    labelBorderActive: "#ff8ae5",
    labelTextActive: "#c14098",
  },
  track: "#d4d4d4",
  labelBorder: "#a8a9ab",
  labelText: "#858585",
} as const;

/** A session that breaks a recruitment rule. The message is safe to show to callers. */
export class RecruitmentValidationError extends Error {
  name = "RecruitmentValidationError";
}

export type RecruitmentKind = "permanent" | "limited";
export type RecruitmentSessionKind = RecruitmentKind | "mixed";

export type RecruitmentPickup = {
  charge: number;
  studentId: string;
  kind?: RecruitmentKind;
};

export type CanonicalPickup = RecruitmentPickup & {
  kind: RecruitmentKind;
};

export type PickupClassification =
  | "beforeSoftPity"
  | "softWin"
  | "afterSoftPity"
  | "hardPity";

export type ComputedPickup = CanonicalPickup & {
  classification: PickupClassification;
};

/**
 * A session as stored, including sessions saved before pulls and charges were
 * tracked per banner type. `RecruitmentSessionInput` is its normalized form
 * and can be used wherever a record is accepted.
 */
export type RecruitmentSessionRecord = {
  kind?: RecruitmentSessionKind;
  startCharge?: number;
  totalPulls?: number;
  permanentStartCharge?: number;
  limitedStartCharge?: number;
  permanentPulls?: number;
  limitedPulls?: number;
  threeStarCount: number;
  rebateTicketsFromPreviousSession: number;
  rebateTicketsUsed?: number;
  isFestBanner?: boolean;
  pickupsObtained: RecruitmentPickup[];
};

export type RecruitmentSessionInput = {
  permanentStartCharge: number;
  limitedStartCharge: number;
  permanentPulls: number;
  limitedPulls: number;
  threeStarCount: number;
  rebateTicketsFromPreviousSession: number;
  rebateTicketsUsed?: number;
  isFestBanner?: boolean;
  pickupsObtained: CanonicalPickup[];
};

export type PoolStats = {
  startCharge: number;
  pulls: number;
  endCharge: number;
  pickupCount: number;
  softPityWins: number;
  softPityLosses: number;
  hardPities: number;
};

export type RecruitmentStats = {
  endCharge: number;
  permanentEndCharge: number;
  limitedEndCharge: number;
  pools: Record<RecruitmentKind, PoolStats>;
  pickupCount: number;
  softPityWins: number;
  softPityLosses: number;
  hardPities: number;
  earnedRebateTickets: number;
  rebateTicketsUsed: number;
  remainingRebateTickets: number;
  paidPulls: number;
  experiencedThreeStarRate: number;
  experiencedPURate: number;
  pullsPerPU: number | null;
  pullsPerThreeStar: number | null;
  rebatePulls: number;
  pyroxenesSpent: number;
  pyroxenesSaved: number;
  pickupClassifications: ComputedPickup[];
};

type StudentAvailability = {
  isLimitedJP?: boolean;
  isFestJP?: boolean;
};

export function pickupPoolKind(student: StudentAvailability): RecruitmentKind {
  return student.isLimitedJP || student.isFestJP ? "limited" : "permanent";
}

export function deriveSessionKind(
  permanentPulls: number,
  limitedPulls: number,
): RecruitmentSessionKind {
  if (permanentPulls > 0 && limitedPulls > 0) {
    return "mixed";
  }

  if (limitedPulls > 0) {
    return "limited";
  }

  return "permanent";
}

export function legacyStartCharge(input: RecruitmentSessionInput): number {
  if (input.permanentPulls > 0) {
    return input.permanentStartCharge;
  }

  if (input.limitedPulls > 0) {
    return input.limitedStartCharge;
  }

  return input.permanentStartCharge;
}

export function totalPullsOf(input: RecruitmentSessionInput): number {
  return input.permanentPulls + input.limitedPulls;
}

export function fallbackPickupKind(
  sessionKind: RecruitmentSessionKind | undefined,
): RecruitmentKind | undefined {
  return sessionKind === "mixed" ? undefined : sessionKind;
}

export function toStoredSessionFields(input: RecruitmentSessionInput) {
  return {
    kind: deriveSessionKind(input.permanentPulls, input.limitedPulls),
    startCharge: legacyStartCharge(input),
    totalPulls: totalPullsOf(input),
    permanentPulls: input.permanentPulls,
    limitedPulls: input.limitedPulls,
    permanentStartCharge: input.permanentStartCharge,
    limitedStartCharge: input.limitedStartCharge,
    pickupsObtained: input.pickupsObtained,
    threeStarCount: input.threeStarCount,
    rebateTicketsFromPreviousSession: input.rebateTicketsFromPreviousSession,
    rebateTicketsUsed: input.rebateTicketsUsed,
    isFestBanner: input.isFestBanner,
  };
}

export function normalizeRecruitmentSession(
  session: RecruitmentSessionRecord,
): RecruitmentSessionInput {
  const isLimited = session.kind === "limited";
  const hasSplit =
    session.permanentPulls != null || session.limitedPulls != null;

  const permanentPulls = hasSplit
    ? (session.permanentPulls ?? 0)
    : isLimited
      ? 0
      : (session.totalPulls ?? 0);

  const limitedPulls = hasSplit
    ? (session.limitedPulls ?? 0)
    : isLimited
      ? (session.totalPulls ?? 0)
      : 0;

  const defaultKind =
    fallbackPickupKind(session.kind) ??
    (limitedPulls > 0 && permanentPulls === 0
      ? "limited"
      : permanentPulls > 0 && limitedPulls === 0
        ? "permanent"
        : undefined);

  return {
    permanentStartCharge:
      session.permanentStartCharge ??
      (isLimited ? 0 : (session.startCharge ?? 0)),
    limitedStartCharge:
      session.limitedStartCharge ??
      (isLimited ? (session.startCharge ?? 0) : 0),
    permanentPulls,
    limitedPulls,
    threeStarCount: session.threeStarCount,
    rebateTicketsFromPreviousSession: session.rebateTicketsFromPreviousSession,
    rebateTicketsUsed: session.rebateTicketsUsed,
    isFestBanner: session.isFestBanner,
    pickupsObtained: session.pickupsObtained.map((pickup) => {
      const kind = pickup.kind ?? defaultKind;

      if (!kind) {
        throw new RecruitmentValidationError(
          "Each pickup must have a valid student and charge.",
        );
      }

      return {
        ...pickup,
        kind,
      };
    }),
  };
}

export function numberOfRebateTickets(totalPulls: number): number {
  return REBATE_MILESTONES.filter((milestone) => milestone + 10 <= totalPulls)
    .length;
}

function pickupsForKind<Pickup extends CanonicalPickup>(
  pickups: Pickup[],
  kind: RecruitmentKind,
): Pickup[] {
  return pickups.filter((pickup) => pickup.kind === kind);
}

/** Whether a charge going from `from` to `to` without a pick-up reaches soft pity on the way. */
function passesSoftPity(from: number, to: number): boolean {
  return from < SOFT_PITY && to >= SOFT_PITY;
}

function calculatePoolStats(
  startCharge: number,
  pulls: number,
  pickups: CanonicalPickup[],
): PoolStats {
  let consumedPulls = 0;
  let softPityWins = 0;
  let softPityLosses = 0;
  let hardPities = 0;

  for (const [index, pickup] of pickups.entries()) {
    const cycleStart = index === 0 ? startCharge : 0;
    consumedPulls += pickup.charge - cycleStart;

    if (pickup.charge === SOFT_PITY) {
      softPityWins += 1;
    } else if (passesSoftPity(cycleStart, pickup.charge)) {
      softPityLosses += 1;
    }

    if (pickup.charge === HARD_PITY) {
      hardPities += 1;
    }
  }

  const lastCycleStart = pickups.length > 0 ? 0 : startCharge;
  const endCharge = lastCycleStart + pulls - consumedPulls;

  // The 50/50 is lost as soon as the charge passes soft pity, not when the
  // pick-up finally arrives.
  if (passesSoftPity(lastCycleStart, endCharge)) {
    softPityLosses += 1;
  }

  return {
    startCharge,
    pulls,
    endCharge,
    pickupCount: pickups.length,
    softPityWins,
    softPityLosses,
    hardPities,
  };
}

export function calculateRecruitmentStats(
  session: RecruitmentSessionRecord,
): RecruitmentStats {
  const input = normalizeRecruitmentSession(session);
  validateRecruitmentSession(input);

  const totalPulls = totalPullsOf(input);
  const pickupCount = input.pickupsObtained.length;

  const permanent = calculatePoolStats(
    input.permanentStartCharge,
    input.permanentPulls,
    pickupsForKind(input.pickupsObtained, "permanent"),
  );

  const limited = calculatePoolStats(
    input.limitedStartCharge,
    input.limitedPulls,
    pickupsForKind(input.pickupsObtained, "limited"),
  );

  const earnedRebateTickets = REBATE_MILESTONES.filter(
    (milestone) => milestone <= totalPulls,
  ).length;

  const availableTickets =
    input.rebateTicketsFromPreviousSession + numberOfRebateTickets(totalPulls);

  const automaticallyUsedTickets = Math.min(
    availableTickets,
    Math.floor(totalPulls / 10),
  );

  const rebateTicketsUsed = input.rebateTicketsUsed ?? automaticallyUsedTickets;

  if (
    !Number.isInteger(rebateTicketsUsed) ||
    rebateTicketsUsed < 0 ||
    rebateTicketsUsed > automaticallyUsedTickets
  ) {
    throw new RecruitmentValidationError(
      `Rebate tickets used must be between 0 and ${automaticallyUsedTickets}.`,
    );
  }

  const rebatePulls = rebateTicketsUsed * 10;
  const paidPulls = totalPulls - rebatePulls;

  return {
    endCharge: legacyStartCharge({
      ...input,
      permanentStartCharge: permanent.endCharge,
      limitedStartCharge: limited.endCharge,
    }),
    permanentEndCharge: permanent.endCharge,
    limitedEndCharge: limited.endCharge,
    pools: {
      permanent,
      limited,
    },
    pickupCount,
    softPityWins: permanent.softPityWins + limited.softPityWins,
    softPityLosses: permanent.softPityLosses + limited.softPityLosses,
    hardPities: permanent.hardPities + limited.hardPities,
    earnedRebateTickets,
    rebateTicketsUsed,
    remainingRebateTickets:
      input.rebateTicketsFromPreviousSession +
      earnedRebateTickets -
      rebateTicketsUsed,
    paidPulls,
    experiencedThreeStarRate:
      totalPulls === 0 ? 0 : (input.threeStarCount / totalPulls) * 100,
    experiencedPURate: totalPulls === 0 ? 0 : (pickupCount / totalPulls) * 100,
    pullsPerPU: pickupCount === 0 ? null : totalPulls / pickupCount,
    pullsPerThreeStar:
      input.threeStarCount === 0 ? null : totalPulls / input.threeStarCount,
    rebatePulls,
    pyroxenesSpent: paidPulls * PYROXENE_COST,
    pyroxenesSaved: rebatePulls * PYROXENE_COST,
    pickupClassifications: input.pickupsObtained.map((pickup) => ({
      ...pickup,
      classification: classifyPickup(pickup.charge),
    })),
  };
}

export type PickupChargeEntry = {
  kind?: RecruitmentKind;
  charge?: number;
  totalPulls?: number;
  chargeAfter?: number;
  calculated: boolean;
};

export type PickupChargeError =
  | "outOfOrder"
  | "exceedsSessionPulls"
  | "noPullsLeft"
  | "aboveHardPity"
  | "invalidNumbers";

export type ResolvedPickupCharge =
  | {
      status: "ok";
      charge: number;
    }
  | {
      status: "pending";
    }
  | {
      status: "error";
      error: PickupChargeError;
    };

type PoolPulls = {
  startCharge: number;
  pulls: number;
};

/** What the pick-ups resolved so far have used up of one banner type's pulls. */
type PoolProgress = {
  chargeSum: number;
  lastTotalPulls: number;
  blocked: boolean;
};

const PENDING: ResolvedPickupCharge = {
  status: "pending",
};

export function resolvePickupCharges(
  pools: Record<RecruitmentKind, PoolPulls>,
  pickups: PickupChargeEntry[],
): ResolvedPickupCharge[] {
  const progress: Record<RecruitmentKind, PoolProgress> = {
    permanent: {
      chargeSum: 0,
      lastTotalPulls: 0,
      blocked: false,
    },
    limited: {
      chargeSum: 0,
      lastTotalPulls: 0,
      blocked: false,
    },
  };

  return pickups.map((pickup) => {
    if (!pickup.kind) {
      return resolvePickupCharge(pickup);
    }

    const pool = progress[pickup.kind];
    const resolved = resolvePickupCharge(pickup, pools[pickup.kind], pool);

    if (resolved.status !== "ok") {
      pool.blocked = true;
      return resolved;
    }

    pool.chargeSum += resolved.charge;

    if (pickup.calculated && pickup.totalPulls !== undefined) {
      pool.lastTotalPulls = pickup.totalPulls;
    }

    return resolved;
  });
}

function resolvePickupCharge(
  pickup: PickupChargeEntry,
  pool?: PoolPulls,
  progress?: PoolProgress,
): ResolvedPickupCharge {
  if (!pickup.calculated) {
    return pickup.charge === undefined
      ? PENDING
      : {
          status: "ok",
          charge: pickup.charge,
        };
  }

  const { totalPulls, chargeAfter } = pickup;

  if (
    !pool ||
    !progress ||
    progress.blocked ||
    totalPulls === undefined ||
    chargeAfter === undefined
  ) {
    return PENDING;
  }

  const fail = (error: PickupChargeError): ResolvedPickupCharge => ({
    status: "error",
    error,
  });

  if (
    !Number.isInteger(totalPulls) ||
    totalPulls < 1 ||
    !Number.isInteger(chargeAfter) ||
    chargeAfter < 0 ||
    chargeAfter > HARD_PITY
  ) {
    return fail("invalidNumbers");
  }

  if (totalPulls < progress.lastTotalPulls) {
    return fail("outOfOrder");
  }

  if (totalPulls > pool.pulls) {
    return fail("exceedsSessionPulls");
  }

  const charge =
    pool.startCharge + totalPulls - progress.chargeSum - chargeAfter;

  if (charge < 1) {
    return fail("noPullsLeft");
  }

  if (charge > HARD_PITY) {
    return fail("aboveHardPity");
  }

  return {
    status: "ok",
    charge,
  };
}

export function classifyPickup(charge: number): PickupClassification {
  if (charge === HARD_PITY) {
    return "hardPity";
  }

  if (charge === SOFT_PITY) {
    return "softWin";
  }

  if (charge > SOFT_PITY) {
    return "afterSoftPity";
  }

  return "beforeSoftPity";
}

export type AggregateBucket = {
  sessionCount: number;
  totalPulls: number;
  paidPulls: number;
  totalThreeStars: number;
  totalPickups: number;
  rebatePulls: number;
  pyroxenesSaved: number;
  softPityWins: number;
  softPityLosses: number;
  hardPities: number;
  naturalPickups: number;
  softWinPickups: number;
  softLossPickups: number;
  hardPityPickups: number;
  pickupChargeHistogram: number[];
};

export type AggregateBucketKey = RecruitmentKind | "fest";
export type AccountAggregates = Record<AggregateBucketKey, AggregateBucket>;

export function emptyAggregateBucket(): AggregateBucket {
  return {
    sessionCount: 0,
    totalPulls: 0,
    paidPulls: 0,
    totalThreeStars: 0,
    totalPickups: 0,
    rebatePulls: 0,
    pyroxenesSaved: 0,
    softPityWins: 0,
    softPityLosses: 0,
    hardPities: 0,
    naturalPickups: 0,
    softWinPickups: 0,
    softLossPickups: 0,
    hardPityPickups: 0,
    pickupChargeHistogram: new Array<number>(HARD_PITY + 1).fill(0),
  };
}

export function emptyAccountAggregates(): AccountAggregates {
  return {
    permanent: emptyAggregateBucket(),
    limited: emptyAggregateBucket(),
    fest: emptyAggregateBucket(),
  };
}

export function getAggregateBucket(
  kind: RecruitmentKind,
  isFestBanner = false,
): AggregateBucketKey {
  return kind === "limited" && isFestBanner ? "fest" : kind;
}

function cloneBucket(bucket: AggregateBucket): AggregateBucket {
  return {
    ...bucket,
    pickupChargeHistogram: [
      ...bucket.pickupChargeHistogram,
    ],
  };
}

function cloneAggregates(aggregates: AccountAggregates): AccountAggregates {
  return {
    permanent: cloneBucket(aggregates.permanent),
    limited: cloneBucket(aggregates.limited),
    fest: cloneBucket(aggregates.fest),
  };
}

/** Splits a session-wide total between the banner types by their share of the pulls. */
function splitByPullShare(
  total: number,
  permanentPulls: number,
  limitedPulls: number,
): Record<RecruitmentKind, number> {
  const pulls = permanentPulls + limitedPulls;

  if (pulls === 0 || total === 0) {
    return {
      permanent: 0,
      limited: 0,
    };
  }

  if (limitedPulls === 0) {
    return {
      permanent: total,
      limited: 0,
    };
  }

  if (permanentPulls === 0) {
    return {
      permanent: 0,
      limited: total,
    };
  }

  const permanent = Math.round((total * permanentPulls) / pulls);

  return {
    permanent,
    limited: total - permanent,
  };
}

const CLASSIFICATION_COUNTERS = {
  beforeSoftPity: "naturalPickups",
  softWin: "softWinPickups",
  afterSoftPity: "softLossPickups",
  hardPity: "hardPityPickups",
} as const satisfies Record<PickupClassification, keyof AggregateBucket>;

/** One banner type's part of a session, as it is added to an aggregate bucket. */
type PoolContribution = {
  pulls: number;
  threeStars: number;
  paidPulls: number;
  rebatePulls: number;
  pyroxenesSaved: number;
  stats: PoolStats;
  pickups: ComputedPickup[];
};

function applyPoolToBucket(
  bucket: AggregateBucket,
  factor: 1 | -1,
  pool: PoolContribution,
): void {
  bucket.sessionCount += factor;
  bucket.totalPulls += factor * pool.pulls;
  bucket.paidPulls += factor * pool.paidPulls;
  bucket.totalThreeStars += factor * pool.threeStars;
  bucket.totalPickups += factor * pool.stats.pickupCount;
  bucket.rebatePulls += factor * pool.rebatePulls;
  bucket.pyroxenesSaved += factor * pool.pyroxenesSaved;
  bucket.softPityWins += factor * pool.stats.softPityWins;
  bucket.softPityLosses += factor * pool.stats.softPityLosses;
  bucket.hardPities += factor * pool.stats.hardPities;

  for (const pickup of pool.pickups) {
    bucket.pickupChargeHistogram[pickup.charge] += factor;
    bucket[CLASSIFICATION_COUNTERS[pickup.classification]] += factor;
  }
}

export function applySessionToAggregates(
  aggregates: AccountAggregates,
  session: RecruitmentSessionRecord,
  stats: RecruitmentStats,
  direction: 1 | -1,
): AccountAggregates {
  const input = normalizeRecruitmentSession(session);
  const result = cloneAggregates(aggregates);

  const split = (total: number) =>
    splitByPullShare(total, input.permanentPulls, input.limitedPulls);

  const offRateThreeStars = split(
    Math.max(0, input.threeStarCount - input.pickupsObtained.length),
  );
  const paidPulls = split(stats.paidPulls);
  const rebatePulls = split(stats.rebatePulls);
  const pyroxenesSaved = split(stats.pyroxenesSaved);

  const contributionOf = (kind: RecruitmentKind): PoolContribution => ({
    pulls: kind === "permanent" ? input.permanentPulls : input.limitedPulls,
    threeStars: stats.pools[kind].pickupCount + offRateThreeStars[kind],
    paidPulls: paidPulls[kind],
    rebatePulls: rebatePulls[kind],
    pyroxenesSaved: pyroxenesSaved[kind],
    stats: stats.pools[kind],
    pickups: pickupsForKind(stats.pickupClassifications, kind),
  });

  if (input.permanentPulls > 0) {
    applyPoolToBucket(result.permanent, direction, contributionOf("permanent"));
  }

  if (input.limitedPulls > 0) {
    applyPoolToBucket(
      result[getAggregateBucket("limited", input.isFestBanner)],
      direction,
      contributionOf("limited"),
    );
  }

  return result;
}

function isCount(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function validatePool(
  startCharge: number,
  pulls: number,
  pickups: CanonicalPickup[],
): void {
  if (!isCount(startCharge) || startCharge > HARD_PITY) {
    throw new RecruitmentValidationError(
      "Start charge must be an integer from 0 to 200.",
    );
  }

  if (!isCount(pulls)) {
    throw new RecruitmentValidationError(
      "Total pulls must be a non-negative integer.",
    );
  }

  let consumedPulls = 0;

  for (const [index, pickup] of pickups.entries()) {
    if (
      !Number.isInteger(pickup.charge) ||
      pickup.charge < 1 ||
      pickup.charge > HARD_PITY ||
      pickup.studentId.length === 0
    ) {
      throw new RecruitmentValidationError(
        "Each pickup must have a valid student and charge.",
      );
    }

    const cycleStart = index === 0 ? startCharge : 0;
    const cyclePulls = pickup.charge - cycleStart;

    if (cyclePulls < 1) {
      throw new RecruitmentValidationError(
        index === 0
          ? "The first pickup charge must be higher than the starting charge."
          : "Pickup charges must increase after each pickup.",
      );
    }

    consumedPulls += cyclePulls;
  }

  if (consumedPulls > pulls) {
    throw new RecruitmentValidationError(
      "Pickup charges require more pulls than this session contains.",
    );
  }

  // The rate-up student is guaranteed at hard pity, so the charge cannot go
  // past it: either a pick-up is missing or the pull count is too high.
  const lastCycleStart = pickups.length > 0 ? 0 : startCharge;

  if (lastCycleStart + pulls - consumedPulls > HARD_PITY) {
    throw new RecruitmentValidationError(
      "The charge cannot pass 200 without a pickup.",
    );
  }
}

export function validateRecruitmentSession(
  session: RecruitmentSessionRecord,
): void {
  const input = normalizeRecruitmentSession(session);

  if (!isCount(input.threeStarCount)) {
    throw new RecruitmentValidationError(
      "3★ count must be a non-negative integer.",
    );
  }

  if (!isCount(input.rebateTicketsFromPreviousSession)) {
    throw new RecruitmentValidationError(
      "Previous rebate tickets must be a non-negative integer.",
    );
  }

  if (
    input.rebateTicketsUsed !== undefined &&
    !isCount(input.rebateTicketsUsed)
  ) {
    throw new RecruitmentValidationError(
      "Rebate tickets used must be a non-negative integer.",
    );
  }

  if (input.threeStarCount < input.pickupsObtained.length) {
    throw new RecruitmentValidationError(
      "3★ count cannot be lower than the number of pickups.",
    );
  }

  validatePool(
    input.permanentStartCharge,
    input.permanentPulls,
    pickupsForKind(input.pickupsObtained, "permanent"),
  );

  validatePool(
    input.limitedStartCharge,
    input.limitedPulls,
    pickupsForKind(input.pickupsObtained, "limited"),
  );
}
