"use client";

import {
  SCENARIO_LINE_WIDTH,
  SCENARIO_VIEW_WIDTH,
} from "@/app/scenario-image-generator/_lib/constants";
import type { Text } from "pixi.js";
import type { RefObject } from "react";

export type ScenarioNameProps = {
  name: string;
  nameRef?: RefObject<Text | null>;
  fontFamily: string;
  y?: number;
};

export function ScenarioName({
  name,
  nameRef,
  fontFamily,
  y,
}: ScenarioNameProps) {
  return (
    <pixiText
      ref={nameRef}
      text={name}
      x={(SCENARIO_VIEW_WIDTH - SCENARIO_LINE_WIDTH) / 2}
      y={y ?? 765}
      style={{
        fontFamily,
        fontSize: 57,
        fontWeight: "700",
        fill: "#ffffff",
        align: "left",
        stroke: {
          width: 4,
          color: "#2b435b",
        },
      }}
    />
  );
}
