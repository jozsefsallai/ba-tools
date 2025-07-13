"use client";

import {
  SCENARIO_VIEW_HEIGHT,
  SCENARIO_VIEW_WIDTH,
} from "@/app/scenario-image-generator/_lib/constants";
import { Assets, Texture } from "pixi.js";
import { useEffect, useMemo, useState } from "react";

export type ScenarioBackgroundProps = {
  background: string;
  scale?: number;
  xOffset?: number;
  yOffset?: number;
};

export function ScenarioBackground({
  background,
  scale = 1,
  xOffset,
  yOffset,
}: ScenarioBackgroundProps) {
  const [texture, setTexture] = useState<Texture>(Texture.EMPTY);

  useEffect(() => {
    Assets.load(background)
      .then((result) => {
        if (!result) {
          return;
        }

        setTexture(result);
      })
      .catch(() => {
        // ignore error
        setTexture(Texture.EMPTY);
      });
  }, [background]);

  const { x, y, width, height } = useMemo(() => {
    if (texture === Texture.EMPTY) {
      return {
        x: 0,
        y: 0,
        width: SCENARIO_VIEW_WIDTH,
        height: SCENARIO_VIEW_HEIGHT,
      };
    }

    const aspectRatio = texture.width / texture.height;
    const isWider = aspectRatio > SCENARIO_VIEW_WIDTH / SCENARIO_VIEW_HEIGHT;

    const baseScaledWidth = SCENARIO_VIEW_HEIGHT * aspectRatio;
    const baseScaledHeight = SCENARIO_VIEW_WIDTH / aspectRatio;

    const scaledWidth = isWider
      ? baseScaledWidth * scale
      : SCENARIO_VIEW_WIDTH * scale;
    const scaledHeight = isWider
      ? SCENARIO_VIEW_HEIGHT * scale
      : baseScaledHeight * scale;

    const x = (SCENARIO_VIEW_WIDTH - scaledWidth) / 2;
    const y = (SCENARIO_VIEW_HEIGHT - scaledHeight) / 2;

    return {
      x,
      y,
      width: scaledWidth,
      height: scaledHeight,
    };
  }, [texture, scale]);

  return (
    <pixiSprite
      texture={texture}
      x={x + (xOffset ?? 0)}
      y={y + (yOffset ?? 0)}
      width={width}
      height={height}
    />
  );
}
