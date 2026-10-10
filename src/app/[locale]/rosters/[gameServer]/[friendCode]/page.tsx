import { RosterView } from "@/app/[locale]/rosters/[gameServer]/[friendCode]/_components/roster-view";
import { redirect } from "@/i18n/navigation";
import { isValidFriendCode } from "@/lib/friend-code";
import { localizedPath, sharingMetadata } from "@/lib/og-metadata.server";
import { OG_DESIGN_VERSION } from "@/lib/og/registry";
import { getCachedPublicRoster } from "@/lib/roster-cache.server";
import { truncateText } from "@/lib/text-utils";
import { GAME_SERVERS, type GameServer } from "@/lib/types";
import { getLocale, getTranslations } from "next-intl/server";
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

  if (!GAME_SERVERS.includes(gameServer) || !isValidFriendCode(friendCode)) {
    return redirect({ href: "/404", locale: await getLocale() });
  }

  try {
    const roster = await getCachedPublicRoster(gameServer, friendCode);

    if (roster.visibility !== "public") {
      throw new Error("Roster not found");
    }

    const locale = await getLocale();
    const t = await getTranslations({ locale });

    const name = roster.name?.trim();

    const rosterTitle = name
      ? t("common.sharing.roster.namedTitle", {
          name,
          friendCode: roster.friendCode,
          server: roster.gameServer,
        })
      : t("common.sharing.roster.unnamedTitle", {
          friendCode: roster.friendCode,
          server: roster.gameServer,
        });

    const title = t("common.sharing.title", {
      title: rosterTitle,
      appName: t("common.appName"),
    });

    const description =
      truncateText(
        removeMd(roster.introduction ?? "")
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
          .join(" "),
        160,
      ) ||
      t("common.sharing.roster.description", {
        name: name || roster.friendCode,
      });

    const ogImagePath = `${localizedPath(`/rosters/${gameServer}/${friendCode}/opengraph-image`, locale)}?v=${roster.lastUpdated}&design=${OG_DESIGN_VERSION}`;

    return sharingMetadata({
      title,
      description,
      image: ogImagePath,
      locale,
      alt: t("common.sharing.roster.imageAlt"),
    });
  } catch {
    return redirect({ href: "/404", locale: await getLocale() });
  }
}

export default async function RosterPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { gameServer, friendCode } = await params;

  if (!GAME_SERVERS.includes(gameServer) || !isValidFriendCode(friendCode)) {
    redirect({ href: "/404", locale: await getLocale() });
  }

  return <RosterView gameServer={gameServer} friendCode={friendCode} />;
}
