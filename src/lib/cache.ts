"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath, updateTag } from "next/cache";
import { isValidFriendCode } from "@/lib/friend-code";
import { userQuery } from "@/lib/public-api/convex.server";
import { rosterCacheTag, rosterPublicPath } from "@/lib/roster-cache.server";
import { GAME_SERVERS, type GameServer } from "@/lib/types";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}

export async function revalidateFormation(formationId: string) {
  const userId = await requireUserId();

  try {
    await userQuery(userId, api.formation.getById, {
      id: formationId as Id<"formation">,
    });
    revalidatePath(`/formation-display?id=${formationId}`);
  } catch (err) {
    console.error("Failed to revalidate formation", formationId, err);
  }
}

export async function revalidateTimeline(timelineId: string) {
  const userId = await requireUserId();

  try {
    await userQuery(userId, api.timeline.getOwnById, {
      id: timelineId as Id<"timeline">,
    });
    revalidatePath(`/timeline-visualizer?id=${timelineId}`);
  } catch (err) {
    console.error("Failed to revalidate timeline", timelineId, err);
  }
}

type RosterKey = {
  gameServer: GameServer;
  friendCode: string;
};

function normalizeRosterKey(entry: RosterKey | undefined) {
  if (!entry || !GAME_SERVERS.includes(entry.gameServer)) {
    return null;
  }

  const friendCode = entry.friendCode.trim();
  return isValidFriendCode(friendCode)
    ? {
        gameServer: entry.gameServer,
        friendCode,
      }
    : null;
}

export async function revalidateRosterPublicCache(
  gameServer: GameServer,
  friendCode: string,
  previous?: RosterKey,
) {
  const userId = await requireUserId();

  try {
    const current = normalizeRosterKey({
      gameServer,
      friendCode,
    });

    if (!current) {
      return;
    }

    const rosters = await userQuery(userId, api.roster.getOwn, {});
    const ownsCurrent = rosters.some(
      (roster) =>
        roster.gameServer === current.gameServer &&
        roster.friendCode === current.friendCode,
    );

    if (!ownsCurrent) {
      return;
    }

    const entries = [
      current,
    ];
    const old = normalizeRosterKey(previous);

    if (
      old &&
      (old.gameServer !== current.gameServer ||
        old.friendCode !== current.friendCode)
    ) {
      entries.push(old);
    }

    for (const entry of entries) {
      updateTag(rosterCacheTag(entry.gameServer, entry.friendCode));
      revalidatePath(rosterPublicPath(entry.gameServer, entry.friendCode));
    }
  } catch (err) {
    console.error("Failed to revalidate roster public cache", err);
  }
}
