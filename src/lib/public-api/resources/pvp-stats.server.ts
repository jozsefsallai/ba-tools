import "server-only";

import type { PaginationOptions } from "convex/server";
import { z } from "zod";
import { publicQuery } from "@/lib/public-api/convex.server";
import { ApiError } from "@/lib/public-api/response";
import { toPage, toResource } from "@/lib/public-api/serialize";
import { PVP_COUNTER_RANGES, PVP_SEASONS } from "@/lib/types";
import { api } from "~convex/api";

export const seasonNumberSchema = z.coerce
  .number()
  .pipe(z.union(PVP_SEASONS.map((season) => z.literal(season))));

const searchSlotSchema = z.object({
  studentId: z.string().optional().describe("The exact student in this slot."),
  range: z
    .number()
    .optional()
    .describe(
      `Striker slots only: match any student with this attack range instead of a specific one. One of ${PVP_COUNTER_RANGES.join(", ")}.`,
    ),
  tank: z
    .boolean()
    .optional()
    .describe(
      "Striker slots only: `true` matches any tank instead of a specific student.",
    ),
});

export async function getPvpStatsStatus() {
  const status = await publicQuery(api.pvpStats.getStatus, {});

  return {
    isUpdating: status?.isUpdating ?? false,
    lastCompletedAt: status?.lastCompletedAt ?? null,
    nextExpectedAt: status?.nextExpectedAt ?? null,
  };
}

const seasonInput = seasonNumberSchema.describe(
  "The Tactical Challenge season number.",
);

export const pvpStatsSummarySchema = z.object({
  season: seasonInput,
});

export async function getPvpStatsSummary({
  season,
}: z.infer<typeof pvpStatsSummarySchema>) {
  return toResource(
    await publicQuery(api.pvpStats.getSummary, {
      seasonNumber: season,
    }),
  );
}

export const pvpTeamsSchema = z.object({
  season: seasonInput,
  role: z
    .enum([
      "attack",
      "defense",
    ])
    .describe("Whether to rank attack or defense teams."),
  minimumBattles: z.coerce
    .number()
    .int()
    .min(1)
    .default(10)
    .describe("Leave out teams with fewer recorded battles."),
  sort: z
    .enum([
      "confidence",
      "winRateDesc",
      "winRateAsc",
      "battles",
    ])
    .default("confidence")
    .describe(
      "`confidence` ranks by the lower bound of a 95% Wilson interval, which accounts for sample size. The others sort by win rate or battle count.",
    ),
  exclude: z
    .array(z.string())
    .default([])
    .describe("Student ids; teams with any of them are left out."),
});

export async function listPvpTeams(
  {
    season,
    role,
    minimumBattles,
    sort,
    exclude,
  }: z.infer<typeof pvpTeamsSchema>,
  paginationOpts: PaginationOptions,
) {
  const snapshot = await publicQuery(api.pvpStats.getRankingsSnapshot, {});
  if (!snapshot) {
    throw new ApiError("NOT_FOUND", "Team rankings are not available yet.");
  }

  return toPage(
    await publicQuery(api.pvpStats.listEffectiveTeams, {
      snapshot,
      seasonNumber: season,
      role,
      minimumBattles,
      sort,
      excludedStudentIds: exclude,
      paginationOpts,
    }),
  );
}

export const pvpStatsSearchSchema = z.object({
  season: seasonInput,
  defenseTeam: z
    .array(searchSlotSchema)
    .max(6)
    .describe(
      "The defense to beat: six slots in order (four strikers, then two specials), with at least one striker slot filled and no student twice.",
    ),
  excludedStudentIds: z
    .array(z.string())
    .default([])
    .describe("Student ids; attack teams with any of them are left out."),
  matchMode: z
    .enum([
      "primary",
      "similar",
    ])
    .optional()
    .describe(
      "`primary` (default) searches for the defense as given. `similar` finds defenses with different tanks or students of similar range; those counters may not work as reliably, and it needs a student in at least one striker slot.",
    ),
  excludeDefenseTeam: z
    .array(searchSlotSchema)
    .max(6)
    .optional()
    .describe(
      "With `similar`: a defense to leave out of the results, usually the exact one already searched.",
    ),
});

export async function searchPvpStats(
  { season, ...input }: z.infer<typeof pvpStatsSearchSchema>,
  paginationOpts: PaginationOptions,
) {
  return toPage(
    await publicQuery(api.pvpStats.search, {
      ...input,
      seasonNumber: season,
      paginationOpts,
    }),
  );
}
