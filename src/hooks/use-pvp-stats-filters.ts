"use client";

import {
  readPvpStatsFilters,
  writePvpStatsFilters,
} from "@/lib/pvp/stats-filters";
import type { PVPSeasonNumber } from "@/lib/types";
import { useEffect, useState } from "react";

export function usePvpStatsFilters() {
  const [seasonNumber, setSeasonNumber] = useState<PVPSeasonNumber>(11);
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
  }, [loaded, seasonNumber, excludedStudentIds]);

  return {
    seasonNumber,
    setSeasonNumber,
    excludedStudentIds,
    setExcludedStudentIds,
    loaded,
  };
}
