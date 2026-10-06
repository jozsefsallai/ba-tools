"use server";

import type { PvpOpponentNameRecognition } from "@/lib/pvp/opponent-name-types";
import { readNameReceipt, saveNameReceipt } from "@/lib/pvp/server/name-cache";
import {
  recognitionInput,
  recognizeOpponentName,
} from "@/lib/pvp/server/name-recognition";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { z } from "zod";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

const cacheInput = z.object({
  receipt: z.string().max(150000),
  matchId: z.string().min(1).max(100),
  seasonId: z.string().min(1).max(100),
});

export async function recognizePvpOpponentName(input: {
  image: string;
  levelEnd?: number;
}): Promise<PvpOpponentNameRecognition | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  try {
    return await recognizeOpponentName(
      recognitionInput.parse(input),
      userId,
      AbortSignal.timeout(25000),
    );
  } catch {
    return null;
  }
}

export async function cachePvpOpponentName(input: {
  receipt: string;
  matchId: string;
  seasonId: string;
}): Promise<boolean> {
  const session = await auth();

  if (!session.userId) {
    return false;
  }

  try {
    const parsed = cacheInput.parse(input);
    readNameReceipt(parsed.receipt, session.userId);

    const token = await session.getToken({ template: "convex" });

    if (!token) {
      return false;
    }

    const match = await fetchQuery(
      api.pvp.getMatchById,
      {
        matchId: parsed.matchId as Id<"pvpMatchRecord">,
        seasonId: parsed.seasonId as Id<"pvpSeason">,
      },
      { token },
    );

    await saveNameReceipt(
      parsed.receipt,
      session.userId,
      match.opponentName ?? "",
    );

    return true;
  } catch {
    return false;
  }
}
