export const REBATE_MILESTONES = [
  70, 130, 150, 170, 270, 330, 350, 370,
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
  pools: {
    permanent: PoolStats;
    limited: PoolStats;
  };
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

export function pickupPoolKind(student: {
  isLimitedJP?: boolean;
  isFestJP?: boolean;
}): RecruitmentKind {
  return student.isLimitedJP || student.isFestJP ? "limited" : "permanent";
}

export function deriveSessionKind(
  permanentPulls: number,
  limitedPulls: number,
): RecruitmentSessionKind {
  if (permanentPulls > 0 && limitedPulls > 0) return "mixed";
  if (limitedPulls > 0) return "limited";
  return "permanent";
}

export function legacyStartCharge(input: RecruitmentSessionInput): number {
  if (input.permanentPulls > 0) return input.permanentStartCharge;
  if (input.limitedPulls > 0) return input.limitedStartCharge;
  return input.permanentStartCharge;
}

export function totalPullsOf(input: RecruitmentSessionInput): number {
  return input.permanentPulls + input.limitedPulls;
}

export function fallbackPickupKind(
  sessionKind: RecruitmentSessionKind | undefined,
): RecruitmentKind | undefined {
  if (sessionKind === "limited") return "limited";
  if (sessionKind === "permanent") return "permanent";
  return undefined;
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
  const hasSplit =
    session.permanentPulls != null || session.limitedPulls != null;
  const permanentPulls = hasSplit
    ? (session.permanentPulls ?? 0)
    : session.kind === "limited"
      ? 0
      : (session.totalPulls ?? 0);
  const limitedPulls = hasSplit
    ? (session.limitedPulls ?? 0)
    : session.kind === "limited"
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
      (session.kind === "limited" ? 0 : (session.startCharge ?? 0)),
    limitedStartCharge:
      session.limitedStartCharge ??
      (session.kind === "limited" ? (session.startCharge ?? 0) : 0),
    permanentPulls,
    limitedPulls,
    threeStarCount: session.threeStarCount,
    rebateTicketsFromPreviousSession: session.rebateTicketsFromPreviousSession,
    rebateTicketsUsed: session.rebateTicketsUsed,
    isFestBanner: session.isFestBanner,
    pickupsObtained: session.pickupsObtained.map((pickup) => {
      const kind = pickup.kind ?? defaultKind;
      if (!kind) {
        throw new Error("Each pickup must have a valid student and charge.");
      }
      return { ...pickup, kind };
    }),
  };
}

export function numberOfRebateTickets(totalPulls: number): number {
  return REBATE_MILESTONES.filter((milestone) => milestone + 10 <= totalPulls)
    .length;
}

function pickupsForKind(
  pickups: CanonicalPickup[],
  kind: RecruitmentKind,
): CanonicalPickup[] {
  return pickups.filter((pickup) => pickup.kind === kind);
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
    } else if (pickup.charge > SOFT_PITY) {
      softPityLosses += 1;
    }
    if (pickup.charge === HARD_PITY) {
      hardPities += 1;
    }
  }

  const remainingPulls = pulls - consumedPulls;
  const endCharge =
    pulls === 0
      ? startCharge
      : Math.min(
          HARD_PITY,
          pickups.length > 0 ? remainingPulls : startCharge + remainingPulls,
        );

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
  session: RecruitmentSessionRecord | RecruitmentSessionInput,
): RecruitmentStats {
  const input = normalizeRecruitmentSession(session);
  validateRecruitmentSession(input);

  const totalPulls = totalPullsOf(input);
  const permanentPickups = pickupsForKind(input.pickupsObtained, "permanent");
  const limitedPickups = pickupsForKind(input.pickupsObtained, "limited");
  const permanent = calculatePoolStats(
    input.permanentStartCharge,
    input.permanentPulls,
    permanentPickups,
  );
  const limited = calculatePoolStats(
    input.limitedStartCharge,
    input.limitedPulls,
    limitedPickups,
  );

  const earnedRebateTickets = REBATE_MILESTONES.filter(
    (milestone) => milestone <= totalPulls,
  ).length;
  const usableEarnedTickets = numberOfRebateTickets(totalPulls);
  const availableTickets =
    input.rebateTicketsFromPreviousSession + usableEarnedTickets;
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
    throw new Error(
      `Rebate tickets used must be between 0 and ${automaticallyUsedTickets}.`,
    );
  }

  const pickupClassifications = input.pickupsObtained.map((pickup) => ({
    ...pickup,
    classification: classifyPickup(pickup.charge),
  }));

  return {
    endCharge: legacyStartCharge({
      ...input,
      permanentStartCharge: permanent.endCharge,
      limitedStartCharge: limited.endCharge,
    }),
    permanentEndCharge: permanent.endCharge,
    limitedEndCharge: limited.endCharge,
    pools: { permanent, limited },
    pickupCount: input.pickupsObtained.length,
    softPityWins: permanent.softPityWins + limited.softPityWins,
    softPityLosses: permanent.softPityLosses + limited.softPityLosses,
    hardPities: permanent.hardPities + limited.hardPities,
    earnedRebateTickets,
    rebateTicketsUsed,
    remainingRebateTickets:
      input.rebateTicketsFromPreviousSession +
      earnedRebateTickets -
      rebateTicketsUsed,
    paidPulls: totalPulls - rebateTicketsUsed * 10,
    experiencedThreeStarRate:
      totalPulls === 0 ? 0 : (input.threeStarCount / totalPulls) * 100,
    experiencedPURate:
      totalPulls === 0 ? 0 : (input.pickupsObtained.length / totalPulls) * 100,
    pullsPerPU:
      input.pickupsObtained.length === 0
        ? null
        : totalPulls / input.pickupsObtained.length,
    pullsPerThreeStar:
      input.threeStarCount === 0 ? null : totalPulls / input.threeStarCount,
    rebatePulls: rebateTicketsUsed * 10,
    pyroxenesSpent: (totalPulls - rebateTicketsUsed * 10) * PYROXENE_COST,
    pyroxenesSaved: rebateTicketsUsed * 10 * PYROXENE_COST,
    pickupClassifications,
  };
}

export function classifyPickup(charge: number): PickupClassification {
  if (charge === HARD_PITY) return "hardPity";
  if (charge === SOFT_PITY) return "softWin";
  if (charge > SOFT_PITY) return "afterSoftPity";
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

export type AccountAggregates = {
  permanent: AggregateBucket;
  limited: AggregateBucket;
  fest: AggregateBucket;
};

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
    pickupChargeHistogram: Array.from({ length: HARD_PITY + 1 }, () => 0),
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
): keyof AccountAggregates {
  if (kind === "limited" && isFestBanner) return "fest";
  return kind;
}

function cloneAggregates(aggregates: AccountAggregates): AccountAggregates {
  return {
    permanent: {
      ...aggregates.permanent,
      pickupChargeHistogram: [...aggregates.permanent.pickupChargeHistogram],
    },
    limited: {
      ...aggregates.limited,
      pickupChargeHistogram: [...aggregates.limited.pickupChargeHistogram],
    },
    fest: {
      ...aggregates.fest,
      pickupChargeHistogram: [...aggregates.fest.pickupChargeHistogram],
    },
  };
}

function splitByPullShare(
  total: number,
  permanentPulls: number,
  limitedPulls: number,
): { permanent: number; limited: number } {
  const pulls = permanentPulls + limitedPulls;
  if (pulls === 0 || total === 0) return { permanent: 0, limited: 0 };
  if (limitedPulls === 0) return { permanent: total, limited: 0 };
  if (permanentPulls === 0) return { permanent: 0, limited: total };
  const permanent = Math.round((total * permanentPulls) / pulls);
  return { permanent, limited: total - permanent };
}

function applyPoolToBucket(
  bucket: AggregateBucket,
  factor: number,
  pulls: number,
  threeStars: number,
  paidPulls: number,
  rebatePulls: number,
  pyroxenesSaved: number,
  poolStats: PoolStats,
  pickups: ComputedPickup[],
): void {
  bucket.sessionCount += factor;
  bucket.totalPulls += factor * pulls;
  bucket.paidPulls += factor * paidPulls;
  bucket.totalThreeStars += factor * threeStars;
  bucket.totalPickups += factor * poolStats.pickupCount;
  bucket.rebatePulls += factor * rebatePulls;
  bucket.pyroxenesSaved += factor * pyroxenesSaved;
  bucket.softPityWins += factor * poolStats.softPityWins;
  bucket.softPityLosses += factor * poolStats.softPityLosses;
  bucket.hardPities += factor * poolStats.hardPities;

  for (const pickup of pickups) {
    bucket.pickupChargeHistogram[pickup.charge] += factor;
    if (pickup.classification === "beforeSoftPity") {
      bucket.naturalPickups += factor;
    }
    if (pickup.classification === "softWin") bucket.softWinPickups += factor;
    if (pickup.classification === "afterSoftPity") {
      bucket.softLossPickups += factor;
    }
    if (pickup.classification === "hardPity") bucket.hardPityPickups += factor;
  }
}

export function applySessionToAggregates(
  aggregates: AccountAggregates,
  session: RecruitmentSessionRecord | RecruitmentSessionInput,
  stats: RecruitmentStats,
  direction: 1 | -1,
): AccountAggregates {
  const input = normalizeRecruitmentSession(session);
  const result = cloneAggregates(aggregates);
  const factor = direction;
  const offRateThreeStars = Math.max(
    0,
    input.threeStarCount - input.pickupsObtained.length,
  );
  const offRateSplit = splitByPullShare(
    offRateThreeStars,
    input.permanentPulls,
    input.limitedPulls,
  );
  const paidSplit = splitByPullShare(
    stats.paidPulls,
    input.permanentPulls,
    input.limitedPulls,
  );
  const rebateSplit = splitByPullShare(
    stats.rebatePulls,
    input.permanentPulls,
    input.limitedPulls,
  );
  const savedSplit = splitByPullShare(
    stats.pyroxenesSaved,
    input.permanentPulls,
    input.limitedPulls,
  );

  if (input.permanentPulls > 0) {
    applyPoolToBucket(
      result.permanent,
      factor,
      input.permanentPulls,
      stats.pools.permanent.pickupCount + offRateSplit.permanent,
      paidSplit.permanent,
      rebateSplit.permanent,
      savedSplit.permanent,
      stats.pools.permanent,
      stats.pickupClassifications.filter(
        (pickup) => pickup.kind === "permanent",
      ),
    );
  }

  if (input.limitedPulls > 0) {
    applyPoolToBucket(
      result[getAggregateBucket("limited", input.isFestBanner ?? false)],
      factor,
      input.limitedPulls,
      stats.pools.limited.pickupCount + offRateSplit.limited,
      paidSplit.limited,
      rebateSplit.limited,
      savedSplit.limited,
      stats.pools.limited,
      stats.pickupClassifications.filter((pickup) => pickup.kind === "limited"),
    );
  }

  return result;
}

function validatePool(
  startCharge: number,
  pulls: number,
  pickups: CanonicalPickup[],
): void {
  if (
    !Number.isInteger(startCharge) ||
    startCharge < 0 ||
    startCharge > HARD_PITY
  ) {
    throw new Error("Start charge must be an integer from 0 to 200.");
  }
  if (!Number.isInteger(pulls) || pulls < 0) {
    throw new Error("Total pulls must be a non-negative integer.");
  }

  let consumedPulls = 0;
  for (const [index, pickup] of pickups.entries()) {
    if (
      !Number.isInteger(pickup.charge) ||
      pickup.charge < 1 ||
      pickup.charge > HARD_PITY ||
      pickup.studentId.length === 0
    ) {
      throw new Error("Each pickup must have a valid student and charge.");
    }
    const cycleStart = index === 0 ? startCharge : 0;
    const cyclePulls = pickup.charge - cycleStart;
    if (cyclePulls < 1) {
      throw new Error(
        index === 0
          ? "The first pickup charge must be higher than the starting charge."
          : "Pickup charges must increase after each pickup.",
      );
    }
    consumedPulls += cyclePulls;
  }

  if (consumedPulls > pulls) {
    throw new Error(
      "Pickup charges require more pulls than this session contains.",
    );
  }
}

export function validateRecruitmentSession(
  session: RecruitmentSessionRecord | RecruitmentSessionInput,
): void {
  const input = normalizeRecruitmentSession(session);

  if (!Number.isInteger(input.threeStarCount) || input.threeStarCount < 0) {
    throw new Error("3★ count must be a non-negative integer.");
  }
  if (
    !Number.isInteger(input.rebateTicketsFromPreviousSession) ||
    input.rebateTicketsFromPreviousSession < 0
  ) {
    throw new Error("Previous rebate tickets must be a non-negative integer.");
  }
  if (
    input.rebateTicketsUsed !== undefined &&
    (!Number.isInteger(input.rebateTicketsUsed) || input.rebateTicketsUsed < 0)
  ) {
    throw new Error("Rebate tickets used must be a non-negative integer.");
  }
  if (input.threeStarCount < input.pickupsObtained.length) {
    throw new Error("3★ count cannot be lower than the number of pickups.");
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
