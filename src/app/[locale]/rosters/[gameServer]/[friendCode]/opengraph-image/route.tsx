import { RosterOgImage } from "@/app/[locale]/rosters/[gameServer]/[friendCode]/_components/roster-og-image";
import { db } from "@/lib/db";
import { isValidFriendCode } from "@/lib/friend-code";
import { getOgAssetUrls } from "@/lib/og-assets.server";
import { makeOgImage } from "@/lib/og-image.server";
import { fetchOgArtwork } from "@/lib/og/artwork.server";
import { getCachedPublicRoster } from "@/lib/roster-cache.server";
import {
  BORROW_SLOT_GAMEMODES,
  BORROW_SLOT_GAMEMODE_SHORT_NAMES,
  GAME_SERVERS,
  GAME_SERVER_NAMES,
  type GameServer,
  type StarLevel,
  type UELevel,
} from "@/lib/types";
import { buildCDNAbsoluteUrl } from "@/lib/url";
import { notFound } from "next/navigation";
import removeMd from "remove-markdown";

export const runtime = "nodejs";
export const revalidate = 86_400;

type PageParams = {
  locale: string;
  gameServer: string;
  friendCode: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<PageParams> },
) {
  const { gameServer, friendCode } = await params;

  if (
    !GAME_SERVERS.includes(gameServer as GameServer) ||
    !isValidFriendCode(friendCode)
  ) {
    notFound();
  }

  let roster: Awaited<ReturnType<typeof getCachedPublicRoster>>;

  try {
    roster = await getCachedPublicRoster(gameServer as GameServer, friendCode);
  } catch {
    notFound();
  }

  if (roster.visibility !== "public") {
    notFound();
  }

  const featuredRosterStudents = roster.students.filter(
    (student) => student.featuredBorrowSlot !== undefined,
  );

  const prismaStudents = await db.student.findMany({
    where: {
      id: {
        in: featuredRosterStudents.map((student) => student.studentId),
      },
    },
  });

  const studentMap = new Map(
    prismaStudents.map((student) => [student.id, student]),
  );

  const featuredBorrowCategories = BORROW_SLOT_GAMEMODES.map((mode) => ({
    label: BORROW_SLOT_GAMEMODE_SHORT_NAMES[mode],
    students: roster.students
      .filter((student) => student.featuredBorrowSlot === mode)
      .slice(0, 3)
      .flatMap((rosterStudent) => {
        const student = studentMap.get(rosterStudent.studentId);

        if (!student) {
          return [];
        }

        return [
          {
            iconUrl: buildCDNAbsoluteUrl(
              `v2/images/students/icons/${rosterStudent.studentId}.png`,
            ),
            level: rosterStudent.level,
            starLevel: rosterStudent.starLevel as StarLevel,
            ueLevel: rosterStudent.ueLevel as UELevel | undefined,
            attackType: student.attackType,
            combatRole: student.combatRole,
          },
        ];
      }),
  })).filter((category) => category.students.length > 0);

  const repPortraitUrl = roster.studentRepId
    ? buildCDNAbsoluteUrl(
        `v2/images/students/portraits/${roster.studentRepId}.png`,
      )
    : undefined;

  const [portrait, ...icons] = await Promise.all([
    repPortraitUrl
      ? fetchOgArtwork(repPortraitUrl)
      : Promise.resolve(undefined),
    ...featuredBorrowCategories.flatMap((category) =>
      category.students.map((student) => fetchOgArtwork(student.iconUrl)),
    ),
  ]);

  let iconIndex = 0;

  for (const category of featuredBorrowCategories) {
    for (const student of category.students) {
      student.iconUrl = icons[iconIndex++] ?? getOgAssetUrls().charBg;
    }
  }

  const png = await makeOgImage(
    <RosterOgImage
      name={roster.name ?? roster.friendCode}
      introduction={
        roster.introduction ? removeMd(roster.introduction) : undefined
      }
      friendCode={roster.friendCode}
      serverName={GAME_SERVER_NAMES[roster.gameServer]}
      accountLevel={roster.accountLevel}
      repPortraitUrl={portrait}
      featuredBorrowCategories={featuredBorrowCategories}
      assets={getOgAssetUrls()}
    />,
  );

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
