"use client";

import {
  SCENARIO_VIEW_HEIGHT,
  SCENARIO_VIEW_WIDTH,
} from "@/app/scenario-image-generator/_lib/constants";
import { useTick } from "@pixi/react";
import * as PIXI from "pixi.js";
import { useEffect, useState } from "react";

const MAX_DISTANCE = 10;
const IDLE_FRAMES = 12;
const SPEED = 0.7;

export type ScenarioTriangleProps = {
  animate?: boolean;
};

export function ScenarioTriangle({ animate }: ScenarioTriangleProps) {
  const [texture, setTexture] = useState<PIXI.Texture>(PIXI.Texture.EMPTY);

  const [yOffset, setYOffset] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = down, -1 = up
  const [idleCounter, setIdleCounter] = useState(0);

  useTick({
    isEnabled: !!animate,
    callback: (tick) => {
      if (!texture || texture === PIXI.Texture.EMPTY) {
        return;
      }

      if (yOffset >= MAX_DISTANCE) {
        setDirection(-1);
      } else if (yOffset <= 0) {
        setDirection(1);
      }

      if (direction === 1 && yOffset <= 0 && idleCounter < IDLE_FRAMES) {
        setIdleCounter((prev) => prev + tick.deltaTime * SPEED);
      } else {
        setIdleCounter(0);
        setYOffset((prev) => prev + direction * tick.deltaTime * SPEED);
      }
    },
  });

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

  useEffect(() => {
    if (animate) {
      return;
    }

    setYOffset(0);
    setDirection(1);
    setIdleCounter(0);
  }, [animate]);

  return (
    <pixiSprite
      texture={texture}
      x={SCENARIO_VIEW_WIDTH - 133 - texture.width}
      y={SCENARIO_VIEW_HEIGHT - 64 + yOffset - texture.height}
    />
  );
}
