import { logger, task, type Task } from "@trigger.dev/sdk";
import type { RawBanner, SetBannersPayload } from "./schemas";
import { db } from "../lib/db";
import type { BannerKind } from "../lib/db/client";

async function getBannerListText(
  banners: RawBanner[],
  kind: BannerKind,
): Promise<string> {
  let output = "";

  for (const banner of banners) {
    output += banner.isFest
      ? `- **[FEST]** ${banner.name}\n`
      : `- ${banner.name}\n`;

    if (banner.isFest) {
      output += "-# ※ Cumulative 3* rate doubled (6%)";

      if (banner.extraStudents && banner.extraStudents.length > 0) {
        const students = await db.student.findMany({
          where: {
            id: {
              in: banner.extraStudents,
            },
          },
          select: {
            name: true,
          },
        });

        if (students.length > 0) {
          const names = students
            .map((s) => s.name)
            .map((name) => name.replace(" / Dealer", ""))
            .join(", ");
          output += `; ${names} also available for recruitment.\n`;
        } else {
          output += "\n";
        }
      }
    }

    const extra = [
      ...(banner.additionalThreeStarStudents ?? []),
      ...((banner.isFest ? [] : banner.extraStudents) ?? []),
    ];

    if (extra.length > 0) {
      const students = await db.student.findMany({
        where: {
          id: {
            in: extra,
          },
        },
        select: {
          name: true,
        },
      });

      if (students.length > 0) {
        const names = students
          .map((s) => s.name)
          .map((name) => name.replace(" / Dealer", ""))
          .join(", ");
        output += `-# ※ ${names} also available for recruitment.\n`;
      }
    }
  }

  output += `\nℹ️ __Notice:__ Recruitment points have been reset for everyone for the **${kind}** region.\n\n`;
  return output;
}

async function getAnnouncementText(banners: RawBanner[]): Promise<string> {
  let output = "## Arona's `/gacha` command has been updated.\n\n";

  const globalBanners = banners.filter((b) => b.kind === "Global");
  const jpBanners = banners.filter((b) => b.kind === "JP");

  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const day = today.getUTCDate();

  const paddedMonth = String(month + 1).padStart(2, "0");
  const paddedDay = String(day).padStart(2, "0");
  const yearStr = String(year).slice(-2);

  const date = `${yearStr}/${paddedMonth}/${paddedDay}`;

  if (globalBanners.length > 0) {
    output += `🌐 **${date} - New global banners:**\n`;
    const globalBannerText = await getBannerListText(globalBanners, "Global");
    output += globalBannerText;
  }

  if (jpBanners.length > 0) {
    output += `🇯🇵 **${date} - New JP banners:**\n`;
    const jpBannerText = await getBannerListText(jpBanners, "JP");
    output += jpBannerText;
  }

  return output;
}

export const setBannersTask: Task<
  "aronabot-set-banners",
  SetBannersPayload,
  string
> = task({
  id: "aronabot-set-banners",
  run: async ({ banners }: SetBannersPayload) => {
    const today = new Date();
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth();
    const day = today.getUTCDate();

    const paddedMonth = String(month + 1).padStart(2, "0");
    const paddedDay = String(day).padStart(2, "0");

    const date = `${year}/${paddedMonth}/${paddedDay}`;

    logger.info(`Updating Global regular banner's date to ${date}.`);

    await db.banner.update({
      where: {
        id: "regular",
      },
      data: {
        date,
      },
    });

    logger.info(`Updating JP regular banner's date to ${date}.`);

    await db.banner.update({
      where: {
        id: "regular_jp",
      },
      data: {
        date,
      },
    });

    logger.info("Removing previous banners.");

    await db.banner.deleteMany({
      where: {
        id: {
          notIn: ["regular", "regular_jp"],
        },
      },
    });

    logger.info("Adding new banners.");

    let globalIndex = 1;
    let jpIndex = 51;

    for (const banner of banners) {
      let sortKey: number;

      switch (banner.kind) {
        case "Global":
          sortKey = globalIndex++;
          break;
        case "JP":
          sortKey = jpIndex++;
          break;
      }

      logger.info(
        `Adding banner ${banner.name} (${banner.id}) with sortKey ${sortKey} to ${banner.kind} banners.`,
      );

      const threeStarRate = banner.isFest ? 60 : 30;
      const pickupRate = banner.isPickup ? 7 : 0;
      const extraRate = banner.isFest ? 9 : 0;

      const baseThreeStarRate = banner.isFest ? 60 : 30;

      const extraPoolStudents = banner.extraStudents ?? [];

      if (banner.isFest) {
        const otherFests = await db.student.findMany({
          where: {
            ...(banner.kind === "Global" ? { isFestGlobal: true } : {}),
            ...(banner.kind === "JP" ? { isFestJP: true } : {}),
            id: {
              notIn: ["hoshino_battle_tank", ...(banner.pickupStudents ?? [])],
            },
          },
        });

        for (const student of otherFests) {
          if (!extraPoolStudents.includes(student.id)) {
            extraPoolStudents.push(student.id);
          }
        }

        banner.extraStudents = extraPoolStudents;
      }

      await db.banner.create({
        data: {
          id: banner.id,
          name: banner.name,

          sortKey,

          date,

          threeStarRate,
          pickupRate,
          extraRate,

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
                  (studentId) => ({ id: studentId }),
                ),
              }
            : undefined,

          baseThreeStarRate,

          kind: banner.kind,
          counterKind: banner.counterKind,
          chargeCategory: banner.chargeCategory,
        },
      });
    }

    logger.info("Finished setting banners.");

    const text = await getAnnouncementText(banners);
    return text;
  },
});
