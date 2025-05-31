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
    Assets.load(background).then((result) => {
      setTexture(result);
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
    const scaledHeight = SCENARIO_VIEW_WIDTH / aspectRatio;
    const y = (SCENARIO_VIEW_HEIGHT - scaledHeight) / 2;

    return {
      x: 0,
      y,
      width: SCENARIO_VIEW_WIDTH,
      height: scaledHeight,
    };
  }, [texture]);

  return (
    <pixiSprite texture={texture} x={x} y={y} width={width} height={height} />
  );
}
