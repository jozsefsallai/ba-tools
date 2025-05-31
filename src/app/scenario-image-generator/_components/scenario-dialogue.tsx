"use client";

import {
  SCENARIO_LINE_WIDTH,
  SCENARIO_VIEW_WIDTH,
} from "@/app/scenario-image-generator/_lib/constants";

export type ScenarioDialogueProps = {
  content: string;
  fontSize?: number;
};

export function ScenarioDialogue({
  content,
  fontSize = 44,
}: ScenarioDialogueProps) {
  return (
    <pixiText
      text={content}
      x={(SCENARIO_VIEW_WIDTH - SCENARIO_LINE_WIDTH) / 2}
      y={870}
      style={{
        fontFamily: "Noto Sans",
        fontSize: fontSize,
        fill: "#ffffff",
        align: "left",
        wordWrap: true,
        wordWrapWidth: SCENARIO_LINE_WIDTH,
      }}
    />
  );
}
