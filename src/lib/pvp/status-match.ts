import type { PvpOcrField, PvpPixelImage } from "@/lib/pvp";

export type PvpStatusTemplates = {
  attack: PvpPixelImage;
  defense: PvpPixelImage;
  win: PvpPixelImage;
  lose: PvpPixelImage;
};

type Box = { x: number; y: number; width: number; height: number };
type Rgb = readonly [number, number, number];

const GRID = 32;

function median(values: number[]) {
  values.sort((a, b) => a - b);
  return values[values.length >> 1] ?? 0;
}

// The report panel behind the status row is a flat fill (grey on the player's
// side, pink on the opponent's), so the crop border tells us what it is
function backgroundOf(image: PvpPixelImage): Rgb {
  const channels: [number[], number[], number[]] = [[], [], []];

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (y > 1 && y < image.height - 2 && x > 1 && x < image.width - 2) {
        continue;
      }

      const i = (y * image.width + x) * 4;

      for (let c = 0; c < 3; c++) {
        channels[c].push(image.pixels[i + c]);
      }
    }
  }

  return [median(channels[0]), median(channels[1]), median(channels[2])];
}

function bounds(
  image: PvpPixelImage,
  test: (index: number) => boolean,
): Box | null {
  // Per-row/column counts so isolated noise pixels don't stretch the box
  const rows = new Uint32Array(image.height);
  const columns = new Uint32Array(image.width);

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (test(y * image.width + x)) {
        rows[y]++;
        columns[x]++;
      }
    }
  }

  const span = (counts: Uint32Array, minimum: number) => {
    let start = 0;
    let end = counts.length - 1;

    while (start <= end && counts[start] < minimum) start++;
    while (end >= start && counts[end] < minimum) end--;

    return end >= start ? ([start, end] as const) : null;
  };

  const vertical = span(rows, 2);
  const horizontal = span(columns, 2);

  if (!vertical || !horizontal) {
    return null;
  }

  return {
    x: horizontal[0],
    y: vertical[0],
    width: horizontal[1] - horizontal[0] + 1,
    height: vertical[1] - vertical[0] + 1,
  };
}

function foregroundBounds(image: PvpPixelImage, background: Rgb) {
  return bounds(image, (index) => {
    const i = index * 4;

    return (
      Math.max(
        Math.abs(image.pixels[i] - background[0]),
        Math.abs(image.pixels[i + 1] - background[1]),
        Math.abs(image.pixels[i + 2] - background[2]),
      ) > 40
    );
  });
}

function templateBounds(image: PvpPixelImage) {
  return bounds(image, (index) => image.pixels[index * 4 + 3] > 96);
}

// Area-averages `box` into a GRID x rows RGB grid, compositing any
// transparency over `background`
function sample(
  image: PvpPixelImage,
  box: Box,
  rows: number,
  background: Rgb,
): Float32Array {
  const grid = new Float32Array(GRID * rows * 3);

  for (let row = 0; row < rows; row++) {
    const top = box.y + (row / rows) * box.height;
    const bottom = box.y + ((row + 1) / rows) * box.height;

    for (let column = 0; column < GRID; column++) {
      const left = box.x + (column / GRID) * box.width;
      const right = box.x + ((column + 1) / GRID) * box.width;

      const sum = [0, 0, 0];
      let count = 0;

      for (let y = Math.floor(top); y < Math.max(top + 1, bottom); y++) {
        for (let x = Math.floor(left); x < Math.max(left + 1, right); x++) {
          const i =
            (Math.min(image.height - 1, y) * image.width +
              Math.min(image.width - 1, x)) *
            4;

          const alpha = image.pixels[i + 3] / 255;

          for (let c = 0; c < 3; c++) {
            sum[c] += image.pixels[i + c] * alpha + background[c] * (1 - alpha);
          }

          count++;
        }
      }

      for (let c = 0; c < 3; c++) {
        grid[(row * GRID + column) * 3 + c] = sum[c] / count;
      }
    }
  }

  return grid;
}

function similarity(
  area: PvpPixelImage,
  found: Box,
  background: Rgb,
  template: PvpPixelImage,
) {
  const box = templateBounds(template);

  if (!box) {
    return 0;
  }

  const rows = Math.max(
    8,
    Math.round((GRID * box.height) / Math.max(1, box.width)),
  );

  const expected = sample(template, box, rows, background);

  let best = 0;

  // Soft shadows and resampling blur can shift the detected edges by a pixel
  // or two; try small nudges and keep the best alignment
  for (const dx of [-2, 0, 2]) {
    for (const dy of [-2, 0, 2]) {
      for (const grow of [-2, 0, 2]) {
        const actual = sample(
          area,
          {
            x: found.x + dx - grow / 2,
            y: found.y + dy - grow / 2,
            width: found.width + grow,
            height: found.height + grow,
          },
          rows,
          background,
        );

        let difference = 0;

        for (let i = 0; i < actual.length; i++) {
          difference += Math.abs(actual[i] - expected[i]);
        }

        best = Math.max(best, 1 - difference / actual.length / 128);
      }
    }
  }

  // Penalize aspect ratio mismatches the resampling would otherwise hide
  const aspect =
    found.width / found.height / (box.width / Math.max(1, box.height));

  return best * Math.min(aspect, 1 / aspect);
}

export function matchPvpStatusTemplate<T extends string>(
  area: PvpPixelImage,
  templates: Record<T, PvpPixelImage>,
): PvpOcrField<T> {
  const background = backgroundOf(area);
  const found = foregroundBounds(area, background);

  if (!found || found.width < 12 || found.height < 12) {
    return {
      value: null,
      rawText: "",
      confidence: 0,
      uncertain: true,
      crop: area,
    };
  }

  const scores = (Object.entries(templates) as [T, PvpPixelImage][])
    .map(([value, template]) => ({
      value,
      score: similarity(area, found, background, template),
    }))
    .sort((a, b) => b.score - a.score);

  const [best, second] = scores;

  return {
    value: best.score >= 0.6 ? best.value : null,
    rawText: scores
      .map(({ value, score }) => `${value}=${score.toFixed(3)}`)
      .join(" "),
    confidence: best.score * 100,
    uncertain: best.score < 0.75 || best.score - (second?.score ?? 0) < 0.1,
    crop: area,
  };
}
