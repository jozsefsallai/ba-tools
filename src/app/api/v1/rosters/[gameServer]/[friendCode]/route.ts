import { isValidFriendCode } from "@/lib/friend-code";
import { ok } from "@/lib/public-api/response";
import { notFound, publicRoute } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { getCachedPublicRoster } from "@/lib/roster-cache.server";
import { GAME_SERVERS, type GameServer } from "@/lib/types";

export const GET = publicRoute<{ gameServer: string; friendCode: string }>(
  async (_req, { gameServer, friendCode }) => {
    if (
      !GAME_SERVERS.includes(gameServer as GameServer) ||
      !isValidFriendCode(friendCode.trim())
    ) {
      throw notFound("Roster not found.");
    }

    const roster = await getCachedPublicRoster(
      gameServer as GameServer,
      friendCode,
    );

    return ok(toResource(roster), { cache: "shared" });
  },
);
