import type { PvpOcrField, PvpPixelImage } from "@/lib/pvp";
import {
  PVP_SCREENSHOT_ROI_BOUNDS,
  type PvpScreenshotROIMap,
} from "@/lib/pvp/screenshot-types";

type Box = { x: number; y: number; width: number; height: number };

type Component = Box & { count: number };

export type PvpUnitCrops = {
  sourceIndex: number;
  combatClass: "Main" | "Support" | null;
  icon: PvpPixelImage;
  damage: PvpPixelImage | null;
};

export type PvpPreparedReport = {
  valid: boolean;
  battleType: PvpOcrField<"ATTACK" | "DEFENSE">;
  result: PvpPixelImage;
  enemyStudentRep: PvpPixelImage;
  enemyName: PvpPixelImage;
  myUnits: PvpUnitCrops[];
  enemyUnits: PvpUnitCrops[];
};

export function cropPvpImage(image: PvpPixelImage, box: Box): PvpPixelImage {
  const x = Math.max(0, Math.floor(box.x));
  const y = Math.max(0, Math.floor(box.y));
  const width = Math.max(1, Math.min(image.width - x, Math.ceil(box.width)));
  const height = Math.max(1, Math.min(image.height - y, Math.ceil(box.height)));

  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let row = 0; row < height; row++) {
    const start = ((y + row) * image.width + x) * 4;

    pixels.set(
      image.pixels.subarray(start, start + width * 4),
      row * width * 4,
    );
  }

  return { width, height, pixels };
}

function components(
  image: PvpPixelImage,
  test: (r: number, g: number, b: number) => boolean,
) {
  const { width, height, pixels } = image;

  const mask = new Uint8Array(width * height);

  for (let i = 0; i < mask.length; i++) {
    mask[i] = Number(
      pixels[i * 4 + 3] > 0 &&
        test(pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]),
    );
  }

  const queue = new Int32Array(mask.length);
  const found: Component[] = [];

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start]) {
      continue;
    }

    let read = 0;
    let write = 1;

    queue[0] = start;
    mask[start] = 0;

    let left = width;
    let right = 0;
    let top = height;
    let bottom = 0;

    while (read < write) {
      const index = queue[read++];

      const x = index % width;
      const y = Math.floor(index / width);

      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);

      for (const next of [
        x > 0 ? index - 1 : -1,
        x + 1 < width ? index + 1 : -1,
        index - width,
        index + width,
      ]) {
        if (next >= 0 && next < mask.length && mask[next]) {
          mask[next] = 0;
          queue[write++] = next;
        }
      }
    }

    found.push({
      x: left,
      y: top,
      width: right - left + 1,
      height: bottom - top + 1,
      count: write,
    });
  }

  return found;
}

const isRed = (r: number, g: number, b: number) => {
  return r > 180 && g < 130 && b < 120;
};

const isBlue = (r: number, g: number, b: number) => {
  return b > 150 && r < 100 && g > 55;
};

const isBadge = (r: number, g: number, b: number) => {
  return (
    r > 30 &&
    r < 105 &&
    g > 30 &&
    g < 110 &&
    b > 30 &&
    b < 120 &&
    Math.max(r, g, b) - Math.min(r, g, b) < 28
  );
};

function segmentTeam(image: PvpPixelImage): PvpUnitCrops[] {
  // The horizontal chart rule remains fixed while numeric badges move with bars
  let baseline = Math.round(image.height * 0.73);
  let longest = image.width * 0.45;

  for (let y = Math.floor(image.height * 0.6); y < image.height * 0.82; y++) {
    let count = 0;

    for (let x = 0; x < image.width; x++) {
      const i = (y * image.width + x) * 4;
      const [r, g, b] = image.pixels.subarray(i, i + 3);

      if (r > 135 && r < 225 && Math.max(r, g, b) - Math.min(r, g, b) < 20) {
        count++;
      }
    }

    if (count > longest) {
      longest = count;
      baseline = y;
    }
  }

  const chart = cropPvpImage(image, {
    x: 0,
    y: 0,
    width: image.width,
    height: baseline,
  });

  const bars = [
    ...components(chart, isRed).map((box) => ({
      ...box,
      combatClass: "Main" as const,
    })),
    ...components(chart, isBlue).map((box) => ({
      ...box,
      combatClass: "Support" as const,
    })),
  ]
    .filter(
      (box) =>
        box.width >= 8 &&
        box.width <= 55 &&
        box.height >= 4 &&
        box.y + box.height >= baseline - 6,
    )
    .sort((a, b) => a.x - b.x);

  const badges = components(chart, isBadge).filter(
    (box) =>
      box.width >= 12 &&
      box.height >= 16 &&
      box.height <= 42 &&
      box.count > box.width * box.height * 0.25,
  );

  // Portrait frames establish occupied columns even if a bar/badge is
  // unreadable
  const frameBand = cropPvpImage(image, {
    x: 0,
    y: baseline + 7,
    width: image.width,
    height: 76,
  });

  const frames = components(frameBand, (r, g, b) => {
    const high = Math.max(r, g, b);
    const low = Math.min(r, g, b);
    return high - low > 35 && low < 210;
  }).filter((box) => box.width > 35 && box.height > 30);

  const centers: { x: number; combatClass: "Main" | "Support" | null }[] =
    bars.map((bar) => ({
      x: bar.x + bar.width / 2,
      combatClass: bar.combatClass,
    }));

  for (const box of [...badges, ...frames]) {
    const x = box.x + box.width / 2;

    if (!centers.some((center) => Math.abs(center.x - x) < 48)) {
      centers.push({ x, combatClass: null });
    }
  }

  centers.sort((a, b) => a.x - b.x);

  if (!centers.length || centers.length > 6) {
    return [];
  }

  return centers.map((center, sourceIndex) => {
    const badge = badges
      .filter((box) => Math.abs(box.x + box.width / 2 - center.x) < 30)
      .sort((a, b) => b.count - a.count)[0];

    return {
      sourceIndex,
      combatClass: center.combatClass,
      icon: cropPvpImage(image, {
        x: center.x - 46,
        y: baseline + 7,
        width: 92,
        height: 76,
      }),
      damage: badge
        ? cropPvpImage(image, {
            x: badge.x + 3,
            y: badge.y + 2,
            width: badge.width - 6,
            height: badge.height - 6,
          })
        : null,
    };
  });
}

type Point = readonly [number, number];

const SHIELD: Point[] = [
  [0.5, 0],
  [0.72, 0.12],
  [1, 0.17],
  [1, 0.66],
  [0.88, 0.81],
  [0.5, 1],
  [0.12, 0.81],
  [0, 0.66],
  [0, 0.17],
  [0.28, 0.12],
];

const SWORD: Point[] = [
  [0.97, 0],
  [1, 0.19],
  [0.56, 0.64],
  [0.7, 0.79],
  [0.61, 0.9],
  [0.45, 0.74],
  [0.18, 1],
  [0, 0.84],
  [0.27, 0.58],
  [0.11, 0.41],
  [0.2, 0.31],
  [0.37, 0.47],
  [0.82, 0.03],
];

function insidePolygon(x: number, y: number, polygon: Point[]) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

export function classifyPvpBattleType(
  image: PvpPixelImage,
): PvpOcrField<"ATTACK" | "DEFENSE"> {
  const iconArea = cropPvpImage(image, {
    x: 0,
    y: 0,
    width: 135,
    height: image.height,
  });

  const blue = (r: number, g: number, b: number) => {
    return b > r + 20 && g > r + 12 && b > 100;
  };

  const component = components(iconArea, blue)
    .filter((box) => box.width > 20 && box.height > 25)
    .sort((a, b) => b.count - a.count)[0];

  if (!component) {
    return {
      value: null,
      rawText: "",
      confidence: 0,
      uncertain: true,
      crop: iconArea,
    };
  }

  const crop = cropPvpImage(iconArea, component);

  // Fill holes (white blade/interior highlights), preserving the outer
  // silhouette
  const mask = new Uint8Array(crop.width * crop.height);
  for (let i = 0; i < mask.length; i++) {
    mask[i] = Number(
      blue(crop.pixels[i * 4], crop.pixels[i * 4 + 1], crop.pixels[i * 4 + 2]),
    );
  }

  const outside = new Uint8Array(mask.length);
  const queue: number[] = [];

  for (let y = 0; y < crop.height; y++) {
    for (let x = 0; x < crop.width; x++) {
      if (x && y && x < crop.width - 1 && y < crop.height - 1) {
        continue;
      }

      const i = y * crop.width + x;

      if (!mask[i] && !outside[i]) {
        outside[i] = 1;
        queue.push(i);
      }
    }
  }

  for (let i = 0; i < queue.length; i++) {
    const index = queue[i];
    const x = index % crop.width;

    for (const next of [
      x > 0 ? index - 1 : -1,
      x + 1 < crop.width ? index + 1 : -1,
      index - crop.width,
      index + crop.width,
    ]) {
      if (next >= 0 && next < mask.length && !mask[next] && !outside[next]) {
        outside[next] = 1;
        queue.push(next);
      }
    }
  }

  const score = (polygon: Point[]) => {
    let union = 0;
    let intersection = 0;

    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const actual =
          !outside[
            Math.min(
              crop.height - 1,
              Math.floor(((y + 0.5) / 32) * crop.height),
            ) *
              crop.width +
              Math.min(
                crop.width - 1,
                Math.floor(((x + 0.5) / 32) * crop.width),
              )
          ];

        const template = insidePolygon((x + 0.5) / 32, (y + 0.5) / 32, polygon);
        union += Number(actual || template);
        intersection += Number(actual && template);
      }

    return intersection / Math.max(1, union);
  };

  const shield = score(SHIELD);
  const sword = score(SWORD);
  const best = Math.max(shield, sword);

  return {
    value: best >= 0.45 ? (shield > sword ? "DEFENSE" : "ATTACK") : null,
    rawText: `shield=${shield.toFixed(3)} sword=${sword.toFixed(3)}`,
    confidence: best * 100,
    uncertain: best < 0.65 || Math.abs(shield - sword) < 0.15,
    crop,
  };
}

export function preparePvpReport(
  rois: PvpScreenshotROIMap<Uint8ClampedArray>,
): PvpPreparedReport {
  const image = (region: keyof typeof rois): PvpPixelImage => {
    const [, , width, height] = PVP_SCREENSHOT_ROI_BOUNDS[region];

    if (rois[region].length !== width * height * 4) {
      throw new Error("Invalid screenshot region dimensions");
    }

    return { width, height, pixels: rois[region] };
  };

  const status = image("battleTypeAndResult");
  const myUnits = segmentTeam(image("myUnits"));
  const enemyUnits = segmentTeam(image("enemyUnits"));

  return {
    valid: myUnits.length > 0 && enemyUnits.length > 0,
    battleType: classifyPvpBattleType(status),
    result: cropPvpImage(status, {
      x: 137,
      y: 0,
      width: 213,
      height: status.height,
    }),
    enemyStudentRep: image("enemyStudentRep"),
    enemyName: image("enemyName"),
    myUnits,
    enemyUnits,
  };
}

export function preprocessPvpText(
  image: PvpPixelImage,
  mode: "text" | "digits" | "result",
  threshold = false,
): PvpPixelImage {
  const pixels = new Uint8ClampedArray(image.pixels.length);

  const isYellow = (r: number, g: number, b: number) => {
    return r > 150 && g > 130 && b < r - 70 && b < g - 40;
  };

  let yellowPixels = 0;

  if (mode === "result") {
    for (let i = 0; i < pixels.length; i += 4) {
      yellowPixels += Number(
        isYellow(image.pixels[i], image.pixels[i + 1], image.pixels[i + 2]),
      );
    }
  }

  for (let i = 0; i < pixels.length; i += 4) {
    const [r, g, b] = image.pixels.subarray(i, i + 3);
    let grey = r * 0.2126 + g * 0.7152 + b * 0.0722;

    if (mode === "digits") {
      grey = 255 - grey;
    }

    // Read Win's solid yellow lettering
    if (mode === "result") {
      grey =
        yellowPixels > image.width * image.height * 0.005
          ? isYellow(r, g, b)
            ? 0
            : 255
          : Math.min(r, g, b);
    }

    if (threshold) {
      grey = grey < (mode === "digits" ? 125 : 150) ? 0 : 255;
    }

    pixels[i] = grey;
    pixels[i + 1] = grey;
    pixels[i + 2] = grey;
    pixels[i + 3] = 255;
  }

  const processed = { width: image.width, height: image.height, pixels };

  if (mode === "result" || mode === "text") {
    let left = image.width;
    let right = -1;
    let top = image.height;
    let bottom = -1;

    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        if (pixels[(y * image.width + x) * 4] >= 160) {
          continue;
        }

        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }

    if (right >= left && bottom >= top) {
      return cropPvpImage(processed, {
        x: left,
        y: top,
        width: right - left + 1,
        height: bottom - top + 1,
      });
    }
  }

  return processed;
}
