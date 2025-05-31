"use client";

import {
  SCENARIO_VIEW_HEIGHT,
  SCENARIO_VIEW_WIDTH,
} from "@/app/scenario-image-generator/_lib/constants";
import * as PIXI from "pixi.js";
import { useEffect, useState } from "react";

export function ScenarioTriangle() {
  const [texture, setTexture] = useState<PIXI.Texture>(PIXI.Texture.EMPTY);

  useEffect(() => {
    if (texture !== PIXI.Texture.EMPTY) {
      return;
    }

    PIXI.Assets.load("/assets/ui/scenario-viewer/scennario-triangle.png").then(
      (result) => {
        setTexture(result);
      },
    );
  }, [texture]);

  return (
    <pixiSprite
      texture={texture}
      x={SCENARIO_VIEW_WIDTH - 133 - texture.width}
      y={SCENARIO_VIEW_HEIGHT - 64 - texture.height}
    />
  );
}
