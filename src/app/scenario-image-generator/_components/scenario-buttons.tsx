"use client";

import { useEffect, useState } from "react";

import * as PIXI from "pixi.js";
import { SCENARIO_VIEW_WIDTH } from "@/app/scenario-image-generator/_lib/constants";

export function ScenarioButtons({
  autoEnabled,
}: {
  autoEnabled?: boolean;
}) {
  const [texture, setTexture] = useState<PIXI.Texture>(PIXI.Texture.EMPTY);

  useEffect(() => {
    PIXI.Assets.load(
      autoEnabled
        ? "/assets/ui/scenario-viewer/buttons_auto_on.png"
        : "/assets/ui/scenario-viewer/buttons_auto_off.png",
    ).then((result) => {
      setTexture(result);
    });
  }, [autoEnabled]);

  return (
    <pixiSprite
      texture={texture}
      x={SCENARIO_VIEW_WIDTH - 20 - texture.width}
      y={25}
    />
  );
}
