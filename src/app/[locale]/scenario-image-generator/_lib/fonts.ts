import type { ScenarioFontData } from "@/app/[locale]/scenario-image-generator/_lib/types";

export const SCENARIO_FONT_EN: ScenarioFontData = {
  label: "Noto Sans (EN)",
  family: "Noto Sans",
};

export const SCENARIO_FONT_KR: ScenarioFontData = {
  label: "경기천년제목 (KR)",
  family: "GyeonggiTitle",
};

export const SCENARIO_FONT_JP: ScenarioFontData = {
  label: "Shin Maru Go (JP)",
  family: "ShinMGoUpr",
  nameY: 748,
  affiliationY: 765,
};

export const SCENARIO_FONTS: ScenarioFontData[] = [
  SCENARIO_FONT_EN,
  SCENARIO_FONT_KR,
  SCENARIO_FONT_JP,
];
