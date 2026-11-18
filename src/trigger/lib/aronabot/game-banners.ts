import { db } from "../../../lib/db";
import type { BannerKind, Prisma } from "../../../lib/db/client";
import type { RawBanner } from "../../schemas";

const REGULAR_BANNER_IDS = [
  "regular",
  "regular_jp",
];

const gameBannerSelect = {
  pickupStudents: {
    select: {
      id: true,
      name: true,
      rarity: true,
      isFestGlobal: true,
      isFestJP: true,
      isLimitedJP: true,
    },
    orderBy: {
      defaultOrder: "asc",
    },
  },
} satisfies Prisma.GameBannerSelect;

type GameBannerRow = Prisma.GameBannerGetPayload<{
  select: typeof gameBannerSelect;
}>;

// Selectable pickups (Recollection Recruitment) aren't in `/gacha`, and only
// 3★ pickups get a banner (a 2★ pickup shares the row of a 3★ one).
const recruitableBanner = {
  isSelectablePickup: false,
  pickupStudents: {
    some: {
      rarity: 3,
    },
  },
} satisfies Prisma.GameBannerWhereInput;

const bannerOrder = [
  {
    startDate: "asc",
  },
  {
    createdAt: "asc",
  },
] satisfies Prisma.GameBannerOrderByWithRelationInput[];

/**
 * The `GameBanner` rows the bot should have for a region: Global gets the
 * banners running now, JP the newest set in the table (the table runs ahead of
 * Global as banners are announced on JP).
 */
async function findGameBanners(
  kind: BannerKind,
  now: Date,
): Promise<GameBannerRow[]> {
  if (kind === "Global") {
    return db.gameBanner.findMany({
      where: {
        ...recruitableBanner,
        startDate: {
          lte: now,
        },
        endDate: {
          gt: now,
        },
      },
      orderBy: bannerOrder,
      select: gameBannerSelect,
    });
  }

  const newest = await db.gameBanner.findFirst({
    where: recruitableBanner,
    orderBy: {
      startDate: "desc",
    },
    select: {
      startDate: true,
    },
  });

  if (!newest) {
    return [];
  }

  return db.gameBanner.findMany({
    where: {
      ...recruitableBanner,
      startDate: newest.startDate,
    },
    orderBy: bannerOrder,
    select: gameBannerSelect,
  });
}

export async function getDesiredBanners(
  kind: BannerKind,
  now: Date,
): Promise<RawBanner[]> {
  const rows = await findGameBanners(kind, now);

  const banners: RawBanner[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    for (const student of row.pickupStudents) {
      if (student.rarity !== 3 || seen.has(student.id)) {
        continue;
      }
      seen.add(student.id);

      banners.push({
        id: student.id,
        name: student.name,
        isPickup: true,
        isFest: kind === "Global" ? student.isFestGlobal : student.isFestJP,
        kind,
        counterKind: "Charge",
        chargeCategory: student.isLimitedJP ? "Unique" : "Standard",
        pickupStudents: [
          student.id,
        ],
      });
    }
  }

  return banners;
}

/**
 * Identifies a region's banners by their pickup students, since banner ids can
 * get a region suffix when saved.
 */
export function getBannerSetSignature(banners: RawBanner[]): string {
  return banners
    .flatMap((b) => b.pickupStudents ?? [])
    .sort()
    .join(",");
}

export async function getCurrentBannerSetSignature(
  kind: BannerKind,
): Promise<string> {
  const banners = await db.banner.findMany({
    where: {
      kind,
      id: {
        notIn: REGULAR_BANNER_IDS,
      },
    },
    select: {
      pickupPoolStudents: {
        select: {
          id: true,
        },
      },
    },
  });

  return banners
    .flatMap((b) => b.pickupPoolStudents.map((s) => s.id))
    .sort()
    .join(",");
}
