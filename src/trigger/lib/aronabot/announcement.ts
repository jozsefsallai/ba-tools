import { db } from "../../../lib/db";
import type { BannerKind } from "../../../lib/db/client";
import type { RawBanner } from "../../schemas";

const MAX_MESSAGE_LENGTH = 2000;

const ANNOUNCEMENT_HEADER = "## Arona's `/gacha` command has been updated.\n\n";

async function getStudentNames(ids: string[]): Promise<string | null> {
  if (ids.length === 0) {
    return null;
  }

  const students = await db.student.findMany({
    where: {
      id: {
        in: ids,
      },
    },
    select: {
      name: true,
    },
  });

  if (students.length === 0) {
    return null;
  }

  return students.map((s) => s.name.replace(" / Dealer", "")).join(", ");
}

async function getBannerEntry(banner: RawBanner): Promise<string> {
  let output = banner.isFest
    ? `- **[FEST]** ${banner.name}\n`
    : `- ${banner.name}\n`;

  if (banner.isFest) {
    output += "-# ※ Cumulative 3* rate doubled (6%)";

    const names = await getStudentNames(banner.extraStudents ?? []);
    output += names ? `; ${names} also available for recruitment.\n` : "\n";
  }

  const extra = [
    ...(banner.additionalThreeStarStudents ?? []),
    ...((banner.isFest ? [] : banner.extraStudents) ?? []),
  ];

  const extraNames = await getStudentNames(extra);
  if (extraNames) {
    output += `-# ※ ${extraNames} also available for recruitment.\n`;
  }

  return output;
}

function getAnnouncementDate(date: Date): string {
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}/${month}/${day}`;
}

async function getRegionBlocks(
  kind: BannerKind,
  banners: RawBanner[],
  date: Date,
): Promise<string[]> {
  const announcementDate = getAnnouncementDate(date);
  const heading =
    kind === "Global"
      ? `🌐 **${announcementDate} - New global banners:**\n`
      : `🇯🇵 **${announcementDate} - New JP banners:**\n`;

  const entries: string[] = [];
  for (const banner of banners) {
    entries.push(await getBannerEntry(banner));
  }

  return [
    heading,
    ...entries,
    `\nℹ️ __Notice:__ Recruitment points have been reset for everyone for the **${kind}** region.\n\n`,
  ];
}

export async function getAnnouncementText(
  banners: RawBanner[],
  date: Date,
): Promise<string> {
  let output = ANNOUNCEMENT_HEADER;

  for (const kind of [
    "Global",
    "JP",
  ] as const) {
    const regionBanners = banners.filter((b) => b.kind === kind);

    if (regionBanners.length > 0) {
      output += (await getRegionBlocks(kind, regionBanners, date)).join("");
    }
  }

  return output;
}

export async function getRegionAnnouncementMessages(
  kind: BannerKind,
  banners: RawBanner[],
  date: Date,
): Promise<string[]> {
  const blocks = [
    ANNOUNCEMENT_HEADER,
    ...(await getRegionBlocks(kind, banners, date)),
  ];

  const messages: string[] = [];
  let current = "";

  for (const block of blocks) {
    if (current.length + block.length > MAX_MESSAGE_LENGTH && current) {
      messages.push(current);
      current = "";
    }

    current += block.slice(0, MAX_MESSAGE_LENGTH);
  }

  if (current) {
    messages.push(current);
  }

  return messages.map((message) => message.trim()).filter(Boolean);
}
