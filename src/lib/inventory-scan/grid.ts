import type {
  GridRow,
  InventoryGrid,
  PixelImage,
  Rect,
} from "@/lib/inventory-scan/types";

// The list's grey background, which shows between the item cards
const GUTTER = [
  197,
  207,
  210,
];
const GUTTER_TOLERANCE = 16;

// Row pitch relative to the column pitch
const PITCH_RATIO = 0.9292;

// The column pitch relative to the width of the list's grey background
const PANEL_PITCH = 165.5 / 907;
const PANEL_PITCH_TOLERANCE = 0.08;

// The cards' sides lean: how far x moves per pixel of height
export const CARD_SLOPE = 0.135;

// Card height relative to the row pitch; the rest is the gap between rows
export const CARD_HEIGHT = 0.925;

const MIN_PANEL_WIDTH = 220;

export function isGutter(image: PixelImage, x: number, y: number) {
  const i = (y * image.width + x) * 4;
  const { pixels } = image;

  return (
    Math.abs(pixels[i] - GUTTER[0]) < GUTTER_TOLERANCE &&
    Math.abs(pixels[i + 1] - GUTTER[1]) < GUTTER_TOLERANCE &&
    Math.abs(pixels[i + 2] - GUTTER[2]) < GUTTER_TOLERANCE
  );
}

/** Bounds of the largest connected area of the list's background colour. */
function findPanel(image: PixelImage): Rect | null {
  const step = Math.max(1, Math.round(image.width / 1000));
  const width = Math.floor(image.width / step);
  const height = Math.floor(image.height / step);
  const mask = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      mask[y * width + x] = Number(isGutter(image, x * step, y * step));
    }
  }

  let best: Rect | null = null;
  let bestArea = 0;
  const stack: number[] = [];

  for (let start = 0; start < mask.length; start++) {
    if (mask[start] !== 1) {
      continue;
    }

    let area = 0;
    let left = width;
    let right = 0;
    let top = height;
    let bottom = 0;

    mask[start] = 2;
    stack.push(start);

    while (stack.length > 0) {
      const index = stack.pop() as number;
      const x = index % width;
      const y = (index - x) / width;

      area++;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            continue;
          }

          const neighbor = ny * width + nx;

          if (mask[neighbor] === 1) {
            mask[neighbor] = 2;
            stack.push(neighbor);
          }
        }
      }
    }

    if (area > bestArea) {
      bestArea = area;
      best = {
        x: left * step,
        y: top * step,
        width: (right - left + 1) * step,
        height: (bottom - top + 1) * step,
      };
    }
  }

  return best && best.width >= MIN_PANEL_WIDTH ? best : null;
}

/** Running totals of a profile, for summing stretches of it quickly. */
function prefixSums(profile: Float32Array) {
  const sums = new Float64Array(profile.length + 1);

  for (let i = 0; i < profile.length; i++) {
    sums[i + 1] = sums[i] + profile[i];
  }

  return sums;
}

/**
 * Mean of the profile where gap lines fall minus its mean elsewhere, leaving
 * out the edges of the gaps. Gaps are narrower than half the pitch, so their
 * stretches never overlap.
 */
function combScore(
  sums: Float64Array,
  pitch: number,
  phase: number,
  gap: number,
  from: number,
  to: number,
) {
  // Total and length of the profile over [a, b], within [from, to)
  const stretch = (a: number, b: number) => {
    const start = Math.max(from, Math.ceil(a));
    const end = Math.min(to - 1, Math.floor(b));

    return end < start
      ? [
          0,
          0,
        ]
      : [
          sums[end + 1] - sums[start],
          end - start + 1,
        ];
  };

  let inside = 0;
  let insideCount = 0;
  let near = 0;
  let nearCount = 0;

  for (
    let center = phase - Math.ceil((phase - from + gap) / pitch) * pitch;
    center <= to + gap;
    center += pitch
  ) {
    const [insideSum, insideLength] = stretch(
      center - gap / 2,
      center + gap / 2,
    );
    const [nearSum, nearLength] = stretch(center - gap, center + gap);
    inside += insideSum;
    insideCount += insideLength;
    near += nearSum;
    nearCount += nearLength;
  }

  const [total, length] = stretch(from, to - 1);
  const outside = total - near;
  const outsideCount = length - nearCount;

  return (
    inside / Math.max(1, insideCount) - outside / Math.max(1, outsideCount)
  );
}

function fitComb(
  profile: Float32Array,
  minPitch: number,
  maxPitch: number,
  gapRatio: number,
  from: number,
  to: number,
) {
  const sums = prefixSums(profile);

  let best = {
    pitch: 0,
    phase: 0,
    score: Number.NEGATIVE_INFINITY,
  };

  const attempt = (pitch: number, phase: number) => {
    const score = combScore(
      sums,
      pitch,
      from + phase,
      Math.max(1, pitch * gapRatio),
      from,
      to,
    );

    if (score > best.score) {
      best = {
        pitch,
        phase: from + phase,
        score,
      };
    }
  };

  const coarse = Math.max(0.5, minPitch / 80);

  for (const pitch of range(minPitch, maxPitch, coarse / 2)) {
    for (let phase = 0; phase < pitch; phase += coarse) {
      attempt(pitch, phase);
    }
  }

  const { pitch: pitch0, phase: phase0 } = best;

  for (const pitch of range(
    Math.max(minPitch, pitch0 - coarse),
    Math.min(maxPitch, pitch0 + coarse),
    0.1,
  )) {
    for (const phase of range(
      phase0 - from - coarse * 3,
      phase0 - from + coarse * 3,
      0.25,
    )) {
      attempt(pitch, phase);
    }
  }

  return best;
}

function range(from: number, to: number, step: number) {
  return Array.from(
    {
      length: Math.floor((to - from) / step) + 1,
    },
    (_, i) => from + i * step,
  );
}

export function detectInventoryGrid(image: PixelImage): InventoryGrid | null {
  const panel = findPanel(image);

  if (!panel) {
    return null;
  }

  const right = panel.x + panel.width;
  const bottom = panel.y + panel.height;

  // Rows: lines where almost everything is background
  const rowProfile = new Float32Array(image.height);

  for (let y = panel.y; y < bottom; y++) {
    let count = 0;

    for (let x = panel.x; x < right; x++) {
      count += Number(isGutter(image, x, y));
    }

    // Card edges leave some background on every line, so only count the lines
    // that clearly are gaps
    rowProfile[y] = Math.max(0, count / panel.width - 0.5) * 2;
  }

  const expected = panel.width * PANEL_PITCH;
  const rowFit = fitComb(
    rowProfile,
    expected * PITCH_RATIO * (1 - PANEL_PITCH_TOLERANCE),
    expected * PITCH_RATIO * (1 + PANEL_PITCH_TOLERANCE),
    1 - CARD_HEIGHT - 0.025,
    panel.y,
    bottom,
  );

  if (rowFit.score < 0.35) {
    return null;
  }

  const pitchY = rowFit.pitch;
  const half = (pitchY * CARD_HEIGHT) / 2;
  const rows: GridRow[] = [];

  for (
    let gap =
      rowFit.phase - Math.ceil((rowFit.phase - panel.y) / pitchY + 1) * pitchY;
    gap < bottom;
    gap += pitchY
  ) {
    const y = gap + pitchY / 2;
    const visible = Math.min(bottom, y + half) - Math.max(panel.y, y - half);

    if (visible > pitchY * 0.15) {
      rows.push({
        y,
        complete:
          y - half >= panel.y - pitchY * 0.025 &&
          y + half <= bottom + pitchY * 0.025,
      });
    }
  }

  const complete = rows.filter((row) => row.complete);

  if (complete.length === 0) {
    return null;
  }

  // Columns: the background along the cards' slanted sides
  const columnProfile = new Float32Array(image.width);

  for (let x = panel.x; x < right; x++) {
    let count = 0;
    let total = 0;

    for (const row of complete) {
      const from = Math.round(row.y - half * 0.75);
      const to = Math.round(row.y + half * 0.75);

      for (let y = Math.max(0, from); y < Math.min(image.height, to); y++) {
        const sx = Math.round(x - (y - row.y) * CARD_SLOPE);

        if (sx >= 0 && sx < image.width) {
          count += Number(isGutter(image, sx, y));
          total++;
        }
      }
    }

    columnProfile[x] = total > 0 ? count / total : 0;
  }

  const pitchX = pitchY / PITCH_RATIO;
  const inset = Math.round(pitchX * 0.12);
  const columnFit = fitComb(
    columnProfile,
    pitchX * 0.99,
    pitchX * 1.01,
    0.02,
    panel.x + inset,
    right - inset,
  );

  if (columnFit.score < 0.25) {
    return null;
  }

  const columns: number[] = [];

  for (
    let x =
      columnFit.phase -
      columnFit.pitch *
        (Math.ceil((columnFit.phase - panel.x) / columnFit.pitch) + 0.5);
    x < right;
    x += columnFit.pitch
  ) {
    if (
      x - columnFit.pitch * 0.5 > panel.x - 2 &&
      x + columnFit.pitch * 0.5 < right + 2
    ) {
      columns.push(x);
    }
  }

  return {
    panel,
    pitchX: columnFit.pitch,
    pitchY,
    columns,
    rows,
  };
}

/** Whether a cell holds an item, rather than only the list's background. */
export function isCellOccupied(
  image: PixelImage,
  grid: InventoryGrid,
  column: number,
  row: GridRow,
) {
  let gutter = 0;
  let total = 0;
  const radiusX = grid.pitchX * 0.35;
  const radiusY = grid.pitchY * 0.35;
  const step = Math.max(1, Math.round(grid.pitchY / 60));

  for (
    let y = Math.round(row.y - radiusY);
    y < Math.min(grid.panel.y + grid.panel.height, row.y + radiusY);
    y += step
  ) {
    for (
      let x = Math.round(column - radiusX);
      x < column + radiusX;
      x += step
    ) {
      if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
        continue;
      }

      gutter += Number(isGutter(image, x, y));
      total++;
    }
  }

  return total > 0 && gutter / total < 0.7;
}
