import "server-only";

import { isValidFriendCode } from "@/lib/friend-code";
import type { GameServer } from "@/lib/types";
import { fetchQuery } from "convex/nextjs";
import { unstable_cache } from "next/cache";
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
    ["public-roster", gameServer, code],
    {
      tags: [rosterCacheTag(gameServer, code)],
      revalidate: 86_400,
    },
  )();
}
