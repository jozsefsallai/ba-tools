"use client";

import {
  SCENARIO_VIEW_HEIGHT,
  SCENARIO_VIEW_WIDTH,
} from "@/app/scenario-image-generator/_lib/constants";
import { Assets, Texture } from "pixi.js";
import { useEffect, useMemo, useState } from "react";

export type ScenarioBackgroundProps = {
  background: string;
};

export function ScenarioBackground({ background }: ScenarioBackgroundProps) {
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

    const scaledWidth = SCENARIO_VIEW_HEIGHT * aspectRatio;
    const scaledHeight = SCENARIO_VIEW_WIDTH / aspectRatio;

    const x = isWider ? (SCENARIO_VIEW_WIDTH - scaledWidth) / 2 : 0;
    const y = isWider ? 0 : (SCENARIO_VIEW_HEIGHT - scaledHeight) / 2;

    const width = isWider ? scaledWidth : SCENARIO_VIEW_WIDTH;
    const height = isWider ? SCENARIO_VIEW_HEIGHT : scaledHeight;

    return {
      x,
      y,
      width,
      height,
    };
  }, [texture]);

  return (
    <pixiSprite texture={texture} x={x} y={y} width={width} height={height} />
  );
}
