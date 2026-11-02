import "server-only";

import { isValidFriendCode } from "@/lib/friend-code";
import { publicQuery } from "@/lib/public-api/convex.server";
import { notFound } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { getCachedPublicRoster } from "@/lib/roster-cache.server";
import { GAME_SERVERS, type GameServer } from "@/lib/types";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export async function getPublicRoster(gameServer: string, friendCode: string) {
  if (
    !GAME_SERVERS.includes(gameServer as GameServer) ||
    !isValidFriendCode(friendCode.trim())
  ) {
    throw notFound("Roster not found.");
  }

  return toResource(
    await getCachedPublicRoster(gameServer as GameServer, friendCode),
  );
}

export async function getPublicTimeline(id: string) {
  const { isOwn: _isOwn, ...timeline } = await publicQuery(
    api.timeline.getById,
    { id: id as Id<"timeline"> },
  );

  if (timeline.visibility !== "public") {
    throw notFound("Timeline not found.");
  }

  return toResource(timeline);
}

export async function getPublicTimelineGroup(id: string) {
  const { isOwn: _isOwn, ...group } = await publicQuery(
    api.timelineGroup.getById,
    { id: id as Id<"timelineGroup"> },
  );

  if (group.visibility !== "public") {
    throw notFound("Timeline group not found.");
  }

  return toResource(group);
}
