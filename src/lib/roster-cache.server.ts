import "server-only";

import { fetchQuery } from "convex/nextjs";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { isValidFriendCode } from "@/lib/friend-code";
import type { GameServer } from "@/lib/types";
import { api } from "~convex/api";

export function rosterCacheTag(gameServer: GameServer, friendCode: string) {
  return `roster:${gameServer}:${friendCode.trim()}`;
}

export function rosterPublicPath(gameServer: GameServer, friendCode: string) {
  return `/rosters/${gameServer}/${friendCode.trim()}`;
}

export async function getCachedPublicRoster(
  gameServer: GameServer,
  friendCode: string,
) {
  const code = friendCode.trim();

  if (!isValidFriendCode(code)) {
    throw new Error("Roster not found");
  }

  return unstable_cache(
    async () =>
      fetchQuery(api.roster.getByGameServerAndFriendCode, {
        gameServer,
        friendCode: code,
      }),
    [
      "public-roster",
      gameServer,
      code,
    ],
    {
      tags: [
        rosterCacheTag(gameServer, code),
      ],
      revalidate: 86_400,
    },
  )();
}

export function invalidatePublicRosters(
  ...rosters: Array<{
    gameServer: GameServer;
    friendCode: string;
  }>
) {
  for (const { gameServer, friendCode } of rosters) {
    revalidateTag(rosterCacheTag(gameServer, friendCode), {
      expire: 0,
    });
    revalidatePath(rosterPublicPath(gameServer, friendCode));
  }
}
