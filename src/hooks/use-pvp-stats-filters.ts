"use client";

import { useEffect, useState } from "react";
import {
  readPvpStatsFilters,
  writePvpStatsFilters,
} from "@/lib/pvp/stats-filters";
import { LATEST_PVP_SEASON, type PVPSeasonNumber } from "@/lib/types";

export function usePvpStatsFilters() {
  const [seasonNumber, setSeasonNumber] =
    useState<PVPSeasonNumber>(LATEST_PVP_SEASON);
  const [excludedStudentIds, setExcludedStudentIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = readPvpStatsFilters();
    setSeasonNumber(saved.seasonNumber);
    setExcludedStudentIds(saved.excludedStudentIds);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    writePvpStatsFilters(seasonNumber, excludedStudentIds);
  }, [
    loaded,
    seasonNumber,
    excludedStudentIds,
  ]);

  return {
    seasonNumber,
    setSeasonNumber,
    excludedStudentIds,
    setExcludedStudentIds,
    loaded,
  };
}
