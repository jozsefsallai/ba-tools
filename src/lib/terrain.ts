import moodA from "@/assets/images/mood_a.png";
import moodB from "@/assets/images/mood_b.png";
import moodC from "@/assets/images/mood_c.png";
import moodD from "@/assets/images/mood_d.png";
import moodS from "@/assets/images/mood_s.png";
import moodSS from "@/assets/images/mood_ss.png";

import terrainIndoor from "@/assets/images/terrain_indoor.png";
import terrainOutdoor from "@/assets/images/terrain_outdoor.png";
import terrainStreet from "@/assets/images/terrain_street.png";

import type { StaticImageData } from "next/image";
import type { Terrain } from "~prisma";

const TERRAIN_GRADES = ["D", "C", "B", "A", "S", "SS"] as const;
export type TerrainGrade = (typeof TERRAIN_GRADES)[number];

export const TERRAIN_GRADES_DESC = [...TERRAIN_GRADES].reverse();

export function getTerrainGrade(adaptation: number) {
  return TERRAIN_GRADES[
    Math.min(Math.max(adaptation, 0), TERRAIN_GRADES.length - 1)
  ];
}

export const TERRAIN_ICONS: Record<Terrain, StaticImageData> = {
  Street: terrainStreet,
  Outdoor: terrainOutdoor,
  Indoor: terrainIndoor,
};

export const TERRAIN_MOOD_ICONS: Record<TerrainGrade, StaticImageData> = {
  D: moodD,
  C: moodC,
  B: moodB,
  A: moodA,
  S: moodS,
  SS: moodSS,
};
