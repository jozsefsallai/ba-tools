import "server-only";

import type { PaginationOptions } from "convex/server";
import { z } from "zod";
import { publicQuery } from "@/lib/public-api/convex.server";
import { ApiError } from "@/lib/public-api/response";
import { toPage, toResource } from "@/lib/public-api/serialize";
import { PVP_SEASONS } from "@/lib/types";
import { api } from "~convex/api";

export const seasonNumberSchema = z.coerce
  .number()
  .pipe(z.union(PVP_SEASONS.map((season) => z.literal(season))));

const searchSlotSchema = z.object({
  studentId: z.string().optional(),
  range: z.number().optional(),
  tank: z.boolean().optional(),
});

export async function getPvpStatsStatus() {
  const status = await publicQuery(api.pvpStats.getStatus, {});

  return {
    isUpdating: status?.isUpdating ?? false,
    lastCompletedAt: status?.lastCompletedAt ?? null,
    nextExpectedAt: status?.nextExpectedAt ?? null,
  };
}

export const pvpStatsSummarySchema = z.object({
  season: seasonNumberSchema,
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
  season: seasonNumberSchema,
  role: z.enum([
    "attack",
    "defense",
  ]),
  minimumBattles: z.coerce.number().int().min(1).default(10),
  sort: z
    .enum([
      "confidence",
      "winRateDesc",
      "winRateAsc",
      "battles",
    ])
    .default("confidence"),
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
  season: seasonNumberSchema,
  defenseTeam: z.array(searchSlotSchema).max(6),
  excludedStudentIds: z.array(z.string()).default([]),
  matchMode: z
    .enum([
      "primary",
      "similar",
    ])
    .optional(),
  excludeDefenseTeam: z.array(searchSlotSchema).max(6).optional(),
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
