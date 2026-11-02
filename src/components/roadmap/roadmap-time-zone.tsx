"use client";

import { createContext, useContext } from "react";
import type { RoadmapTimeZone } from "@/lib/roadmap/time-zone";

const RoadmapTimeZoneContext = createContext<RoadmapTimeZone>("utc");

export const RoadmapTimeZoneProvider = RoadmapTimeZoneContext.Provider;

export function useRoadmapTimeZone(): RoadmapTimeZone {
  return useContext(RoadmapTimeZoneContext);
}
