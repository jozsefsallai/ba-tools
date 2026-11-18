import { createClient } from "redis";
import type { BannerKind } from "../../../lib/db/client";

// AronaBot's keys are `<prefix>:<guildId>:<userId>` (src/gacha/points.ts and
// src/gacha/pulls.ts in the bot). Spark charges (`gacha_charge…`) are kept.
const COUNTER_PREFIXES: Record<
  BannerKind,
  {
    points: string;
    pulls: string;
  }
> = {
  Global: {
    points: "gacha",
    pulls: "gacha_pulls",
  },
  JP: {
    points: "gacha_jp",
    pulls: "gacha_pulls_jp",
  },
};

export type ResetCountersResult = {
  points: number;
  pulls: number;
};

/**
 * Sets every user's recruitment points and total pulls of a region to 0, like
 * the bot's `/rrp` command.
 */
export async function resetRecruitmentCounters(
  kind: BannerKind,
): Promise<ResetCountersResult> {
  const url = process.env.ARONABOT_REDIS_URL;
  if (!url) {
    throw new Error("ARONABOT_REDIS_URL is not set");
  }

  const client = createClient({
    url,
  });

  client.on("error", () => {});

  await client.connect();

  try {
    const prefixes = COUNTER_PREFIXES[kind];

    const reset = async (prefix: string) => {
      let count = 0;

      // The `:` keeps `gacha:*` from matching `gacha_jp:…` and the others
      for await (const keys of client.scanIterator({
        MATCH: `${prefix}:*`,
        COUNT: 500,
      })) {
        if (keys.length === 0) {
          continue;
        }

        await client.mSet(
          keys.map(
            (key) =>
              [
                key,
                "0",
              ] as [
                string,
                string,
              ],
          ),
        );
        count += keys.length;
      }

      return count;
    };

    return {
      points: await reset(prefixes.points),
      pulls: await reset(prefixes.pulls),
    };
  } finally {
    await client.quit();
  }
}
