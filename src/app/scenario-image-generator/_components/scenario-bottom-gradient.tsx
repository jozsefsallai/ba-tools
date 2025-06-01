"use client";

import { SCENARIO_VIEW_WIDTH } from "@/app/scenario-image-generator/_lib/constants";
import * as PIXI from "pixi.js";
import { useMemo } from "react";

const WIDTH = SCENARIO_VIEW_WIDTH;
const HEIGHT = 410;

export function ScenarioBottomGradient() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, "rgba(17, 37, 54, 0)");
    gradient.addColorStop(0.33, "rgba(17, 37, 54, 0.75)");
    gradient.addColorStop(0.55, "rgba(17, 37, 54, 0.86)");
    gradient.addColorStop(1, "rgba(17, 37, 54, 0.86)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    return PIXI.Texture.from(canvas);
  }, []);

  return (
    <pixiSprite
      texture={texture as any}
      width={WIDTH}
      height={HEIGHT}
      x={0}
      y={1080 - HEIGHT}
    />
  );
}
