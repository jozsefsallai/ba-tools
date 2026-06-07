"use server";

import { rosterCacheTag, rosterPublicPath } from "@/lib/roster-cache.server";
import type { GameServer } from "@/lib/types";
import { revalidatePath, updateTag } from "next/cache";

export async function clearCache(path?: string) {
  try {
    if (path) {
      revalidatePath(path);
    } else {
      revalidatePath("/", "layout");
    }
  } catch (err) {
    console.error("Failed to revalidate path", path, err);
  }
}

export async function revalidateRosterPublicCache(
  gameServer: GameServer,
  friendCode: string,
  previous?: { gameServer: GameServer; friendCode: string },
) {
  try {
    const entries: Array<{ gameServer: GameServer; friendCode: string }> = [
      { gameServer, friendCode },
    ];

    if (previous) {
      entries.push(previous);
    }

    const seen = new Set<string>();

    for (const entry of entries) {
      const code = entry.friendCode.trim();
      if (!code) {
        continue;
      }

      const key = `${entry.gameServer}:${code}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      updateTag(rosterCacheTag(entry.gameServer, code));
      revalidatePath(rosterPublicPath(entry.gameServer, code));
    }
  } catch (err) {
    console.error("Failed to revalidate roster public cache", err);
  }
}
