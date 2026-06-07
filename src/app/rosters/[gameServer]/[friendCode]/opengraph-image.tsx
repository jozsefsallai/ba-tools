import { RosterOgImage } from "@/app/rosters/[gameServer]/[friendCode]/_components/roster-og-image";
import { db } from "@/lib/db";
import { getOgAssetUrls } from "@/lib/og-assets.server";
import { OG_HEIGHT, OG_WIDTH, makeOgImage } from "@/lib/og-image.server";
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

export const runtime = "nodejs";
export const revalidate = 86_400;

export const alt = "Roster preview";
export const size = { width: OG_WIDTH, height: OG_HEIGHT };
export const contentType = "image/png";

type PageParams = {
  gameServer: GameServer;
  friendCode: string;
};

export default async function Image({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { gameServer, friendCode } = await params;

  if (!GAME_SERVERS.includes(gameServer)) {
    notFound();
  }

  let roster: Awaited<ReturnType<typeof getCachedPublicRoster>>;

  try {
    roster = await getCachedPublicRoster(gameServer, friendCode);
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

  const png = await makeOgImage(
    <RosterOgImage
      name={roster.name ?? roster.friendCode}
      introduction={roster.introduction}
      friendCode={roster.friendCode}
      serverName={GAME_SERVER_NAMES[roster.gameServer]}
      accountLevel={roster.accountLevel}
      repPortraitUrl={repPortraitUrl}
      featuredBorrowCategories={featuredBorrowCategories}
      assets={getOgAssetUrls()}
    />,
  );

  return new Response(png.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
