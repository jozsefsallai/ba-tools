import { logger } from "@trigger.dev/sdk";
import { db } from "../../../lib/db";
import type { BannerKind } from "../../../lib/db/client";
import type { RawBanner } from "../../schemas";

const REGULAR_BANNER_IDS: Record<BannerKind, string> = {
  Global: "regular",
  JP: "regular_jp",
};

const FIRST_SORT_KEY: Record<BannerKind, number> = {
  Global: 1,
  JP: 51,
};

export function getBannerDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}/${month}/${day}`;
}

async function withFestExtras(banner: RawBanner): Promise<RawBanner> {
  if (!banner.isFest) {
    return banner;
  }

  const otherFests = await db.student.findMany({
    where: {
      ...(banner.kind === "Global"
        ? {
            isFestGlobal: true,
          }
        : {
            isFestJP: true,
          }),
      id: {
        notIn: [
          "hoshino_battle_tank",
          ...(banner.pickupStudents ?? []),
        ],
      },
    },
    select: {
      id: true,
    },
  });

  const extraStudents = [
    ...(banner.extraStudents ?? []),
  ];

  for (const student of otherFests) {
    if (!extraStudents.includes(student.id)) {
      extraStudents.push(student.id);
    }
  }

  return {
    ...banner,
    extraStudents,
  };
}

export async function setBanners(
  kinds: BannerKind[],
  banners: RawBanner[],
  date: Date,
): Promise<RawBanner[]> {
  const bannerDate = getBannerDate(date);
  const regionBanners = banners.filter((b) => kinds.includes(b.kind));

  const resolved: RawBanner[] = [];
  for (const banner of regionBanners) {
    resolved.push(await withFestExtras(banner));
  }

  await db.$transaction(
    async (tx) => {
      for (const kind of kinds) {
        logger.info(`Updating ${kind} regular banner's date to ${bannerDate}.`);

        await tx.banner.update({
          where: {
            id: REGULAR_BANNER_IDS[kind],
          },
          data: {
            date: bannerDate,
          },
        });
      }

      logger.info(`Removing previous ${kinds.join(" and ")} banners.`);

      await tx.banner.deleteMany({
        where: {
          kind: {
            in: kinds,
          },
          id: {
            notIn: Object.values(REGULAR_BANNER_IDS),
          },
        },
      });

      const takenIds = new Set(
        (
          await tx.banner.findMany({
            select: {
              id: true,
            },
          })
        ).map((b) => b.id),
      );

      const sortKeys = {
        ...FIRST_SORT_KEY,
      };

      for (const banner of resolved) {
        const sortKey = sortKeys[banner.kind]++;

        let id = banner.id;
        if (takenIds.has(id)) {
          id = `${banner.id}_${banner.kind.toLowerCase()}`;
        }
        takenIds.add(id);

        logger.info(
          `Adding banner ${banner.name} (${id}) with sortKey ${sortKey} to ${banner.kind} banners.`,
        );

        const extraPoolStudents = banner.extraStudents ?? [];

        await tx.banner.create({
          data: {
            id,
            name: banner.name,
            sortKey,
            date: bannerDate,

            threeStarRate: banner.isFest ? 60 : 30,
            pickupRate: banner.isPickup ? 7 : 0,
            extraRate: banner.isFest ? 9 : 0,
            baseThreeStarRate: banner.isFest ? 60 : 30,

            pickupPoolStudents: banner.pickupStudents
              ? {
                  connect: banner.pickupStudents.map((studentId) => ({
                    id: studentId,
                  })),
                }
              : undefined,

            extraPoolStudents:
              extraPoolStudents.length > 0
                ? {
                    connect: extraPoolStudents.map((studentId) => ({
                      id: studentId,
                    })),
                  }
                : undefined,

            additionalThreeStarStudents: banner.additionalThreeStarStudents
              ? {
                  connect: banner.additionalThreeStarStudents.map(
                    (studentId) => ({
                      id: studentId,
                    }),
                  ),
                }
              : undefined,

            kind: banner.kind,
            counterKind: banner.counterKind,
            chargeCategory: banner.chargeCategory,
          },
        });
      }
    },
    {
      timeout: 60_000,
    },
  );

  logger.info("Finished setting banners.");

  return resolved;
}
