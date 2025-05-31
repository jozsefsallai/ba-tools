"use client";

import { SCENARIO_VIEW_WIDTH } from "@/app/scenario-image-generator/_lib/constants";
import * as PIXI from "pixi.js";
import { useMemo } from "react";

const WIDTH = SCENARIO_VIEW_WIDTH;
const HEIGHT = 370;

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
    gradient.addColorStop(0, "rgba(0, 11, 34, 0)");
    gradient.addColorStop(0.2, "rgba(0, 18, 28, 0.7)");
    gradient.addColorStop(1, "rgba(0, 18, 28, 0.7)");

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
