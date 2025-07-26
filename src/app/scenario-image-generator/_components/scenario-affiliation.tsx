"use client";

import {
  SCENARIO_LINE_WIDTH,
  SCENARIO_VIEW_WIDTH,
} from "@/app/scenario-image-generator/_lib/constants";

export type ScenarioAffiliationProps = {
  affiliation: string;
  nameOffset: number;
  fontFamily: string;
  y?: number;
};

export function ScenarioAffiliation({
  affiliation,
  nameOffset,
  fontFamily,
  y,
}: ScenarioAffiliationProps) {
  return (
    <pixiText
      text={affiliation}
      x={(SCENARIO_VIEW_WIDTH - SCENARIO_LINE_WIDTH) / 2 + nameOffset + 13}
      y={y ?? 781}
      style={{
        fontFamily,
        fontSize: 41,
        fontWeight: "700",
        letterSpacing: -0.4,
        fill: "#7accf9",
        align: "left",
        stroke: {
          width: 4,
          color: "#2b435b",
        },
      }}
    />
  );
}
