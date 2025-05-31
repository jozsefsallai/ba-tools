"use client";

import {
  SCENARIO_LINE_HEIGHT,
  SCENARIO_LINE_WIDTH,
  SCENARIO_VIEW_WIDTH,
} from "@/app/scenario-image-generator/_lib/constants";

export function ScenarioLine() {
  return (
    <pixiGraphics
      draw={(g) => {
        const start = (SCENARIO_VIEW_WIDTH - SCENARIO_LINE_WIDTH) / 2;
        const end = start + SCENARIO_LINE_WIDTH;

        g.clear();
        g.setStrokeStyle({
          color: 0xffffff,
          width: SCENARIO_LINE_HEIGHT,
          alpha: 0.5,
        });
        g.moveTo(start, 844);
        g.lineTo(end, 844);

        g.stroke();
      }}
      x={0}
      y={0}
      width={1920}
      height={1080}
    />
  );
}
