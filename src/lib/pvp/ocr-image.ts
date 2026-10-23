import type {
  PvpBattleInfo,
  PvpOcrMode,
  PvpPixelImage,
  PvpUnitPosition,
} from "@/lib/pvp";
import { maskPvpIconCard } from "@/lib/pvp/icon-card";
import { findPvpReportRules } from "@/lib/pvp/screenshot-layout";
import {
  type PVPScreenshotROIs,
  PVP_SCREENSHOT_ROI_BOUNDS,
} from "@/lib/pvp/screenshot-types";
import {
  type PvpStatusTemplates,
  matchPvpStatusTemplate,
} from "@/lib/pvp/status-match";

type Box = { x: number; y: number; width: number; height: number };

type Component = Box & { count: number };

export type PvpUnitCrops = PvpUnitPosition & {
  icon: PvpPixelImage;
  damage: PvpPixelImage | null;
};

export type PvpPreparedReport = {
  valid: boolean;
  battleType: PvpBattleInfo["battleType"];
  result: PvpBattleInfo["result"];
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
  const bandTop = Math.floor(image.height * 0.6);

  const baselineBand = cropPvpImage(image, {
    x: 0,
    y: bandTop,
    width: image.width,
    height: Math.ceil(image.height * 0.22),
  });

  const rule = findPvpReportRules(baselineBand)
    .filter((line) => line.right - line.left >= image.width * 0.7)
    .sort((a, b) => b.right - b.left - (a.right - a.left))[0];

  if (rule) {
    baseline = bandTop + rule.y;
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

  const centers: { x: number; combatClass: PvpUnitPosition["combatClass"] }[] =
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
      icon: maskPvpIconCard(
        cropPvpImage(image, {
          x: center.x - 46,
          y: baseline + 7,
          width: 92,
          height: 76,
        }),
        "team",
      ),
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

export function preparePvpReport(
  rois: PVPScreenshotROIs,
  templates: PvpStatusTemplates,
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
    battleType: matchPvpStatusTemplate(
      cropPvpImage(status, { x: 0, y: 0, width: 135, height: status.height }),
      { ATTACK: templates.attack, DEFENSE: templates.defense },
    ),
    result: matchPvpStatusTemplate(
      cropPvpImage(status, {
        x: 137,
        y: 0,
        width: 213,
        height: status.height,
      }),
      { WIN: templates.win, LOSE: templates.lose },
    ),
    enemyStudentRep: maskPvpIconCard(
      image("enemyStudentRep"),
      "representative",
    ),
    enemyName: image("enemyName"),
    myUnits,
    enemyUnits,
  };
}

export function preprocessPvpText(
  image: PvpPixelImage,
  mode: PvpOcrMode,
  threshold = false,
): PvpPixelImage {
  const pixels = new Uint8ClampedArray(image.pixels.length);

  for (let i = 0; i < pixels.length; i += 4) {
    const [r, g, b] = image.pixels.subarray(i, i + 3);
    let grey = r * 0.2126 + g * 0.7152 + b * 0.0722;

    if (mode === "digits") {
      grey = 255 - grey;
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

  if (mode === "text") {
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
