import { Storage } from "@/lib/storage";
import { type PVPSeasonNumber, PVP_SEASONS } from "@/lib/types";

const seasonStorage = new Storage<unknown>("pvp_stats_season");
const exclusionsStorage = new Storage<unknown>("pvp_stats_excluded_students");

export function readPvpStatsFilters() {
  let seasonNumber: PVPSeasonNumber = 11;
  let excludedStudentIds: string[] = [];

  try {
    const season = seasonStorage.get();

    if (PVP_SEASONS.includes(season as PVPSeasonNumber)) {
      seasonNumber = season as PVPSeasonNumber;
    }
  } catch {
    // ignore
  }

  try {
    const excluded = exclusionsStorage.get();

    if (Array.isArray(excluded)) {
      excludedStudentIds = [
        ...new Set(
          excluded.filter(
            (id): id is string => typeof id === "string" && id.length > 0,
          ),
        ),
      ];
    }
  } catch {
    // ignore
  }

  return { seasonNumber, excludedStudentIds };
}

export function writePvpStatsFilters(
  seasonNumber: PVPSeasonNumber,
  excludedStudentIds: string[],
) {
  try {
    seasonStorage.set(seasonNumber);
  } catch {
    // ignore
  }

  try {
    exclusionsStorage.set(excludedStudentIds);
  } catch {
    // ignore
  }
}
