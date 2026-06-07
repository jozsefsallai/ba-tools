import { RosterView } from "@/app/rosters/[gameServer]/[friendCode]/_components/roster-view";
import { OG_HEIGHT, OG_WIDTH } from "@/lib/og-image.server";
import { getCachedPublicRoster } from "@/lib/roster-cache.server";
import { truncateText } from "@/lib/text-utils";
import { GAME_SERVERS, type GameServer } from "@/lib/types";
import { redirect } from "next/navigation";
import removeMd from "remove-markdown";

export const revalidate = 86_400;

type PageParams = {
  gameServer: GameServer;
  friendCode: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { gameServer, friendCode } = await params;

  if (!GAME_SERVERS.includes(gameServer)) {
    return redirect("/404");
  }

  try {
    const roster = await getCachedPublicRoster(gameServer, friendCode);

    const title = roster.name
      ? `${roster.name}'s Roster / ${roster.friendCode} (${roster.gameServer}) - Joe's Blue Archive Tools`
      : `${roster.friendCode} (${roster.gameServer}) Roster - Joe's Blue Archive Tools`;

    const description = roster.introduction
      ? truncateText(
          removeMd(roster.introduction)
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0)
            .join(" "),
          160,
        )
      : `View ${roster.name ?? roster.friendCode}'s Blue Archive roster.`;

    const ogImagePath = `/rosters/${gameServer}/${friendCode}/opengraph-image?v=${roster.lastUpdated}`;

    return {
      title,
      description,
      twitter: {
        card: "summary_large_image",
        images: [ogImagePath],
      },
      openGraph: {
        title,
        description,
        images: [
          {
            url: ogImagePath,
            width: OG_WIDTH,
            height: OG_HEIGHT,
            alt: "Roster preview",
          },
        ],
      },
    };
  } catch {
    return redirect("/404");
  }
}

export default async function RosterPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { gameServer, friendCode } = await params;
  return <RosterView gameServer={gameServer} friendCode={friendCode} />;
}
