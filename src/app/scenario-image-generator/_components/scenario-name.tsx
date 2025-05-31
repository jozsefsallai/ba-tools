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
};

export function ScenarioName({ name, nameRef }: ScenarioNameProps) {
  return (
    <pixiText
      ref={nameRef}
      text={name}
      x={(SCENARIO_VIEW_WIDTH - SCENARIO_LINE_WIDTH) / 2}
      y={760}
      style={{
        fontFamily: "Noto Sans",
        fontSize: 63,
        fontWeight: "600",
        fill: "#ffffff",
        align: "left",
        stroke: {
          width: 2,
          color: "#00204c",
        },
      }}
    />
  );
}
