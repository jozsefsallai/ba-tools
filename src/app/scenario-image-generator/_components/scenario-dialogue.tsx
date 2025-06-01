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
  fontSize = 41,
}: ScenarioDialogueProps) {
  return (
    <pixiText
      text={content}
      x={(SCENARIO_VIEW_WIDTH - SCENARIO_LINE_WIDTH) / 2 + 4}
      y={861}
      style={{
        fontFamily: "Noto Sans",
        fontSize: fontSize,
        fill: "#ffffff",
        align: "left",
        letterSpacing: 0.4,
        lineHeight: 1.4 * fontSize,
        stroke: {
          width: 4,
          color: "#2b435b",
        },
        wordWrap: true,
        wordWrapWidth: SCENARIO_LINE_WIDTH,
      }}
    />
  );
}
