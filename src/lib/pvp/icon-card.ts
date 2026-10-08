import type { PvpPixelImage } from "@/lib/pvp";

export type PvpIconCardKind = "team" | "representative";

// Unclipped rectangular artwork bounds, including the parts hidden by the
// tilted outline. The portrait itself is not sheared by the card frame.
export const PVP_ICON_CARD_BOUNDS = {
  team: { x: 0.033, y: 0.072, width: 0.934, height: 0.915 },
  representative: { x: 0.025, y: 0.041, width: 0.938, height: 0.906 },
} as const;

// Measured from the alpha cutouts in the 2560x1600 pvp-template.png.
// Chart rules map to the normalized report at scale 1.28, offset (51.72, 267).
// Team coordinates are relative to the 92x76 crop centered on the card;
// representative coordinates are relative to its 150x125 ROI. The outlines
// are inset from the transparent cutouts to exclude borders and resampling.
export const PVP_ICON_CARD_POLYGONS = {
  team: [
    [0.20279, 0.12377],
    [0.16882, 0.16488],
    [0.15183, 0.2574],
    [0.12636, 0.43215],
    [0.09239, 0.61719],
    [0.06692, 0.79194],
    [0.05842, 0.88446],
    [0.07541, 0.92558],
    [0.79721, 0.92558],
    [0.82269, 0.88446],
    [0.83967, 0.79194],
    [0.86515, 0.61719],
    [0.89912, 0.43215],
    [0.92459, 0.2574],
    [0.94158, 0.16488],
    [0.9161, 0.12377],
  ],
  representative: [
    [0.16062, 0.097],
    [0.15021, 0.12825],
    [0.13458, 0.222],
    [0.10854, 0.40325],
    [0.0825, 0.57825],
    [0.05125, 0.7595],
    [0.04083, 0.85325],
    [0.04083, 0.8845],
    [0.81687, 0.8845],
    [0.83771, 0.85325],
    [0.84812, 0.7595],
    [0.87937, 0.57825],
    [0.90542, 0.40325],
    [0.93146, 0.222],
    [0.94708, 0.12825],
    [0.94187, 0.097],
  ],
} as const;

export function maskPvpIconCard(
  image: PvpPixelImage,
  kind: PvpIconCardKind,
): PvpPixelImage {
  const polygon = PVP_ICON_CARD_POLYGONS[kind];
  const pixels = image.pixels.slice();

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const u = (x + 0.5) / image.width;
      const v = (y + 0.5) / image.height;
      let inside = false;

      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }

      if (!inside) {
        pixels.fill(
          0,
          (y * image.width + x) * 4,
          (y * image.width + x + 1) * 4,
        );
      }
    }
  }

  return { ...image, pixels, iconCard: kind };
}
