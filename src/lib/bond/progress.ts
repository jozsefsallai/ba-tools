import {
  favorTable,
  favorTableMap,
  getBondLevelFromTotalExp,
  lessonsFavorTable,
} from "@/lib/favor-table";

export const MAX_BOND_RANK = 100;
export const MAX_BOND_EXP = favorTableMap[MAX_BOND_RANK].totalExp;

export type RemainingExpBreakdown = {
  headpats: number;
  normalSRGifts: number;
  likedSRGifts: number;
  lovedSRGifts: number;
  adoredSRGifts: number;
  likedSSRGifts: number;
  lovedSSRGifts: number;
  adoredSSRGifts: number;
};

export type ExpSource = keyof RemainingExpBreakdown;

export const EXP_VALUES: RemainingExpBreakdown = {
  headpats: 15,
  normalSRGifts: 20,
  likedSRGifts: 40,
  lovedSRGifts: 60,
  adoredSRGifts: 80,
  likedSSRGifts: 120,
  lovedSSRGifts: 180,
  adoredSSRGifts: 240,
};

const EXP_SOURCES = Object.keys(EXP_VALUES) as ExpSource[];

const SSR_SOURCES = new Set<ExpSource>([
  "likedSSRGifts",
  "lovedSSRGifts",
  "adoredSSRGifts",
]);

export function emptyBreakdown(): RemainingExpBreakdown {
  return {
    headpats: 0,
    normalSRGifts: 0,
    likedSRGifts: 0,
    lovedSRGifts: 0,
    adoredSRGifts: 0,
    likedSSRGifts: 0,
    lovedSSRGifts: 0,
    adoredSSRGifts: 0,
  };
}

type GiftRarity = {
  rarity: string;
};

export type StudentGiftRarities = {
  giftsAdored: GiftRarity[];
  giftsLoved: GiftRarity[];
  giftsLiked: GiftRarity[];
};

export function getExpSources(student: StudentGiftRarities): ExpSource[] {
  const hasSR = (gifts: GiftRarity[]) =>
    gifts.some((gift) => gift.rarity === "SR");

  return EXP_SOURCES.filter((source) => {
    switch (source) {
      case "likedSRGifts":
        return hasSR(student.giftsLiked);
      case "lovedSRGifts":
        return hasSR(student.giftsLoved);
      case "adoredSRGifts":
        return hasSR(student.giftsAdored);
      default:
        return true;
    }
  });
}

export function getRemainingExpBreakdown(
  expNeeded: number,
  student: StudentGiftRarities,
): RemainingExpBreakdown {
  const result = emptyBreakdown();

  for (const source of getExpSources(student)) {
    result[source] = Math.ceil(expNeeded / EXP_VALUES[source]);
  }

  return result;
}

export function padExp(expNeeded: number) {
  return Math.ceil(expNeeded / EXP_VALUES.headpats) * EXP_VALUES.headpats;
}

export function getOptimalBreakdown(
  paddedExp: number,
  available: ExpSource[],
  excludeSSRGifts = false,
): RemainingExpBreakdown {
  const result = emptyBreakdown();
  const sources = excludeSSRGifts
    ? available.filter((source) => !SSR_SOURCES.has(source))
    : available;

  const dp = new Array<number>(paddedExp + 1).fill(Number.POSITIVE_INFINITY);
  dp[0] = 0;

  for (const source of sources) {
    const expValue = EXP_VALUES[source];

    for (let j = expValue; j <= paddedExp; ++j) {
      dp[j] = Math.min(dp[j], dp[j - expValue] + 1);
    }
  }

  if (dp[paddedExp] === Number.POSITIVE_INFINITY) {
    return result;
  }

  let current = paddedExp;

  while (current > 0) {
    for (let i = sources.length - 1; i >= 0; --i) {
      const source = sources[i];
      const expValue = EXP_VALUES[source];

      if (current >= expValue && dp[current] === dp[current - expValue] + 1) {
        result[source]++;
        current -= expValue;
        break;
      }
    }
  }

  return result;
}

export function getLessonsNeeded(exp: number) {
  return lessonsFavorTable.map((lesson) => ({
    lesson,
    count: Math.ceil(exp / lesson.exp),
    countWithBonus: Math.ceil(exp / (lesson.exp + lesson.bonusExp)),
    expectedCount: Math.ceil(
      exp / (lesson.exp + lesson.bonusExp * lesson.bonusChance),
    ),
  }));
}

export function clampBondExp(exp: number) {
  return Math.max(0, Math.min(Math.floor(exp), MAX_BOND_EXP));
}

export function getTargetBondRank(exp: number) {
  return favorTable.find((entry) => entry.totalExp >= exp)?.level ?? 1;
}

export function getRankProgress(exp: number) {
  const rank = getBondLevelFromTotalExp(exp);
  const { totalExp, expToNextLevel } = favorTableMap[rank];
  const isMaxRank = rank >= MAX_BOND_RANK;

  return {
    rank,
    exp,
    rankExp: isMaxRank ? null : exp - totalExp,
    rankExpRequired: isMaxRank ? null : expToNextLevel,
    expToNextRank: isMaxRank ? null : totalExp + expToNextLevel - exp,
  };
}

export function getBondRanks() {
  return favorTable
    .filter((entry) => entry.level <= MAX_BOND_RANK)
    .map(({ level, totalExp, expToNextLevel }) => ({
      rank: level,
      totalExp,
      rankExpRequired: level === MAX_BOND_RANK ? null : expToNextLevel,
    }));
}

export type BondProgressInput = {
  currentExp: number;
  targetExp?: number;
  giftExp: number;
  giftBoxExp: number;
};

export function getBondProgress({
  currentExp,
  targetExp,
  giftExp,
  giftBoxExp,
}: BondProgressInput) {
  const current = clampBondExp(currentExp);
  const projected = Math.max(0, Math.floor(current + giftExp + giftBoxExp));
  const target = targetExp === undefined ? null : clampBondExp(targetExp);

  return {
    current: getRankProgress(current),
    planned: {
      giftExp,
      giftBoxExp,
      totalExp: giftExp + giftBoxExp,
    },
    projected: getRankProgress(projected),
    target:
      target === null
        ? null
        : {
            rank: getTargetBondRank(target),
            exp: target,
            expNeeded: Math.max(0, target - current),
            expNeededAfterGifts: Math.max(0, target - projected),
            reachedWithGifts: projected >= target,
          },
  };
}

export function getRemainingExpOptions(
  expNeeded: number,
  student: StudentGiftRarities,
) {
  const sources = getExpSources(student);
  const paddedExp = padExp(expNeeded);

  const pick = (breakdown: RemainingExpBreakdown) =>
    Object.fromEntries(
      sources.flatMap((source) =>
        breakdown[source] > 0
          ? [
              [
                source,
                breakdown[source],
              ],
            ]
          : [],
      ),
    );

  return {
    expNeeded,
    singleSource: sources.map((source) => {
      const count = Math.ceil(expNeeded / EXP_VALUES[source]);

      return {
        source,
        expEach: EXP_VALUES[source],
        count,
        wastedExp: count * EXP_VALUES[source] - expNeeded,
      };
    }),
    optimal: {
      totalExp: paddedExp,
      withSSRGifts: pick(getOptimalBreakdown(paddedExp, sources)),
      withoutSSRGifts: pick(getOptimalBreakdown(paddedExp, sources, true)),
    },
    lessons: getLessonsNeeded(expNeeded).map(({ lesson, ...counts }) => ({
      ...lesson,
      ...counts,
    })),
  };
}
