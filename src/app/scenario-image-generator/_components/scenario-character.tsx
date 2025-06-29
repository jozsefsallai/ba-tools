"use client";

import { SCENARIO_VIEW_WIDTH } from "@/app/scenario-image-generator/_lib/constants";
import { AdjustmentFilter, ColorOverlayFilter, CRTFilter } from "pixi-filters";
import { Assets, type Filter, Texture } from "pixi.js";
import { useEffect, useMemo, useState } from "react";

export type ScenarioCharacterProps = {
  spriteUrl: string;
  x: number;
  y: number;
  scale: number;
  darken?: boolean;
  hologram?: boolean;
  silhouette?: boolean;
  silhouetteColor?: number;
};

export function ScenarioCharacter({
  spriteUrl,
  x,
  y,
  scale,
  darken = false,
  hologram = false,
  silhouette = false,
  silhouetteColor = 0x000000,
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

  const filters = useMemo<Filter[]>(() => {
    const filters: Filter[] = [];

    if (silhouette) {
      filters.push(
        new ColorOverlayFilter({ color: silhouetteColor, alpha: 1 }),
      );
    }

    if (darken) {
      filters.push(new ColorOverlayFilter({ color: 0x000000, alpha: 0.33 }));
    }

    if (hologram) {
      filters.push(
        new ColorOverlayFilter({ color: 0x71c5ff, alpha: 0.35 }),
        new AdjustmentFilter({
          contrast: 1.1,
          saturation: 0.6,
          brightness: 1.1,
          gamma: 0.8,
        }),
        new CRTFilter({
          lineWidth: 3.6,
          vignetting: 0,
          lineContrast: 0.15,
        }),
      );
    }

    return filters;
  }, [darken, hologram, silhouette, silhouetteColor]);

  return (
    <pixiSprite
      texture={texture}
      x={SCENARIO_VIEW_WIDTH / 2 + x}
      y={50 + y}
      width={width}
      height={height}
      anchor={{ x: 0.5, y: 0 }}
      filters={filters}
    />
  );
}
