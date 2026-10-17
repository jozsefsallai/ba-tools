"use client";

import type { RoadmapTimeZone } from "@/lib/roadmap/time-zone";
import { createContext, useContext } from "react";

const RoadmapTimeZoneContext = createContext<RoadmapTimeZone>("utc");

export const RoadmapTimeZoneProvider = RoadmapTimeZoneContext.Provider;

export function useRoadmapTimeZone(): RoadmapTimeZone {
  return useContext(RoadmapTimeZoneContext);
}
