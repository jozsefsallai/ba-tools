"use client";

import { SCENARIO_VIEW_WIDTH } from "@/app/scenario-image-generator/_lib/constants";
import { AdjustmentFilter } from "pixi-filters";
import { Assets, Texture } from "pixi.js";
import { useEffect, useMemo, useState } from "react";

export type ScenarioCharacterProps = {
  spriteUrl: string;
  x: number;
  y: number;
  scale: number;
  darken?: boolean;
};

export function ScenarioCharacter({
  spriteUrl,
  x,
  y,
  scale,
  darken = false,
}: ScenarioCharacterProps) {
  const [texture, setTexture] = useState<Texture>(Texture.EMPTY);

  useEffect(() => {
    Assets.load(spriteUrl)
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
  }, [spriteUrl]);

  const { width, height } = useMemo(() => {
    if (texture === Texture.EMPTY) {
      return { width: 0, height: 0 };
    }

    return { width: texture.width * scale, height: texture.height * scale };
  }, [texture, scale]);

  return (
    <pixiSprite
      texture={texture}
      x={SCENARIO_VIEW_WIDTH / 2 + x}
      y={50 + y}
      width={width}
      height={height}
      anchor={{ x: 0.5, y: 0 }}
      filters={darken ? [new AdjustmentFilter({ brightness: 0.67 })] : []}
    />
  );
}
