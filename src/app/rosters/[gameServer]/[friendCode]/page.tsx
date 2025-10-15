import { RosterView } from "@/app/rosters/[gameServer]/[friendCode]/_components/roster-view";
import { truncateText } from "@/lib/text-utils";
import { GAME_SERVERS, type GameServer } from "@/lib/types";
import { buildStudentIconUrlFromId } from "@/lib/url";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import removeMd from "remove-markdown";
import { api } from "~convex/api";

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
    const roster = await fetchQuery(api.roster.getByGameServerAndFriendCode, {
      gameServer,
      friendCode,
    });

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

    const image = roster.studentRepId
      ? buildStudentIconUrlFromId(roster.studentRepId)
      : undefined;

    return {
      title,
      description,
      twitter: {
        card: "summary",
      },
      openGraph: {
        title,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch (err) {
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
