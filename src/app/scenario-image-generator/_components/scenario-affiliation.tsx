"use client";

import {
  SCENARIO_LINE_WIDTH,
  SCENARIO_VIEW_WIDTH,
} from "@/app/scenario-image-generator/_lib/constants";

export type ScenarioAffiliationProps = {
  affiliation: string;
  nameOffset: number;
};

export function ScenarioAffiliation({
  affiliation,
  nameOffset,
}: ScenarioAffiliationProps) {
  return (
    <pixiText
      text={affiliation}
      x={(SCENARIO_VIEW_WIDTH - SCENARIO_LINE_WIDTH) / 2 + nameOffset + 20}
      y={778}
      style={{
        fontFamily: "Noto Sans",
        fontSize: 44,
        fontWeight: "600",
        fill: "#7accf9",
        align: "left",
        stroke: {
          width: 2,
          color: "#00204c",
        },
      }}
    />
  );
}
