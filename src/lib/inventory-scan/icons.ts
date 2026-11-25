import {
  ITEM_ICON_HEIGHT as H,
  ITEM_ICON_BYTES,
  ITEM_ICON_PIXELS,
  type ItemIcon,
  ITEM_ICON_WIDTH as W,
} from "@/lib/inventory-scan/catalog-format";
import { resample } from "@/lib/inventory-scan/resample";
import type {
  IconMatch,
  InventoryGrid,
  PixelImage,
  ScanParcelType,
} from "@/lib/inventory-scan/types";

// Coarse templates are half the size
const CW = W / 2;
const CH = H / 2;

// The icon's place in its cell, relative to the column pitch
export const ICON_WIDTH = 1.04;
export const ICON_OFFSET_X = 0.018;
export const ICON_OFFSET_Y = 0.006;

// Offsets around the expected place, in half template pixels
const SEARCH = 3;
const MARGIN = SEARCH + 1;
const PATCH_W = (W + MARGIN) * 2;
const PATCH_H = (H + MARGIN) * 2;

const FINE_CANDIDATES = 60;

// Icons tried at every coarse offset, out of those that match best near the
// middle
const SHORTLIST = 200;

// How opaque pixels have to be to count
const OPAQUE = 0.94;
const COARSE = 0.75;
const THIN = 0.15;

// Icons covering less of the cell than this are thin
const MIN_MASK = 0.18;

// Average card colors, for the see-through edges of thin icons
const CARD_COLORS: Record<
  ItemIcon["rarity"],
  readonly [
    number,
    number,
    number,
  ]
> = {
  N: [
    226,
    232,
    238,
  ],
  R: [
    185,
    216,
    252,
  ],
  SR: [
    250,
    218,
    140,
  ],
  SSR: [
    208,
    165,
    252,
  ],
};

// Matches this close to the best one are compared where they differ
const CLOSE_SCORE = 0.08;

// How much a difference in average color counts against a match
const COLOR_PENALTY = 0.8;

export type IconTemplates = {
  icons: ItemIcon[];
  fine: Float32Array[];
  fineMasks: {
    plain: Uint16Array[];
    badge: Uint16Array[];
  };
  coarse: Float32Array[];
  coarseMasks: {
    plain: Uint16Array[];
    badge: Uint16Array[];
  };
};

/** Parts of a cell that other things are drawn over. */
function isCovered(u: number, v: number, badge: boolean) {
  // The count, and the tier badge on equipment
  if (v > 0.76 || (v > 0.66 && u > 0.3)) {
    return true;
  }

  // "6 day(s)" on items that expire
  return badge && v < 0.3;
}

function maskOf(
  alpha: (i: number) => number,
  width: number,
  height: number,
  badge: boolean,
  minimum: number,
): Uint16Array {
  const indices: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;

      if (
        alpha(i) > minimum &&
        !isCovered((x + 0.5) / width, (y + 0.5) / height, badge)
      ) {
        indices.push(i);
      }
    }
  }

  return Uint16Array.from(indices);
}

export function buildIconTemplates(
  icons: ItemIcon[],
  pixels: Uint8Array,
): IconTemplates {
  if (pixels.length !== icons.length * ITEM_ICON_BYTES) {
    throw new Error("Item icon catalog/template mismatch");
  }

  const templates: IconTemplates = {
    icons,
    fine: [],
    fineMasks: {
      plain: [],
      badge: [],
    },
    coarse: [],
    coarseMasks: {
      plain: [],
      badge: [],
    },
  };

  for (let icon = 0; icon < icons.length; icon++) {
    const base = icon * ITEM_ICON_BYTES;
    const alphaAt = (i: number) => pixels[base + i * 4 + 3] / 255;

    // Thin icons have hardly any fully opaque pixels, so their edges are used
    // too, blended with the card's color
    const opaque = maskOf(alphaAt, W, H, false, OPAQUE);
    const thin = opaque.length < ITEM_ICON_PIXELS * MIN_MASK;
    const card = CARD_COLORS[icons[icon].rarity];

    const fine = new Float32Array(ITEM_ICON_PIXELS * 3);
    const coarse = new Float32Array(CW * CH * 3);
    const coarseAlpha = new Float32Array(CW * CH);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const c = (y >> 1) * CW + (x >> 1);
        const alpha = alphaAt(i);
        coarseAlpha[c] += alpha / 4;

        for (let channel = 0; channel < 3; channel++) {
          const value = pixels[base + i * 4 + channel];
          const blended = value * alpha + card[channel] * (1 - alpha);

          fine[i * 3 + channel] = thin ? blended : value;
          coarse[c * 3 + channel] += blended / 4;
        }
      }
    }

    templates.fine.push(fine);
    templates.coarse.push(coarse);

    for (const badge of [
      false,
      true,
    ]) {
      const kind = badge ? "badge" : "plain";
      templates.fineMasks[kind].push(
        maskOf(alphaAt, W, H, badge, thin ? THIN : OPAQUE),
      );
      templates.coarseMasks[kind].push(
        maskOf((i) => coarseAlpha[i], CW, CH, badge, thin ? THIN : COARSE),
      );
    }
  }

  return templates;
}

/** Averages `factor` squares of the patch, starting at an offset. */
function shrink(
  patch: Float32Array,
  offsetX: number,
  offsetY: number,
  factor: number,
  width: number,
  height: number,
) {
  const output = new Float32Array(width * height * 3);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 3;

      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          const i =
            ((y * factor + dy + offsetY) * PATCH_W +
              x * factor +
              dx +
              offsetX) *
            3;

          output[o] += patch[i];
          output[o + 1] += patch[i + 1];
          output[o + 2] += patch[i + 2];
        }
      }

      const area = factor * factor;
      output[o] /= area;
      output[o + 1] /= area;
      output[o + 2] /= area;
    }
  }

  return output;
}

/** Correlation of the template's own pixels, so the card behind is ignored. */
function similarity(
  query: Float32Array,
  template: Float32Array,
  mask: Uint16Array,
) {
  let correlation = 0;
  let queryVariance = 0;
  let templateVariance = 0;
  let colorDifference = 0;

  for (let channel = 0; channel < 3; channel++) {
    let q = 0;
    let t = 0;
    let qq = 0;
    let tt = 0;
    let qt = 0;

    for (let m = 0; m < mask.length; m++) {
      const i = mask[m] * 3 + channel;
      const a = query[i];
      const b = template[i];
      q += a;
      t += b;
      qq += a * a;
      tt += b * b;
      qt += a * b;
    }

    const n = mask.length;
    correlation += qt - (q * t) / n;
    queryVariance += qq - (q * q) / n;
    templateVariance += tt - (t * t) / n;
    colorDifference += Math.abs(q - t) / n;
  }

  return (
    correlation / Math.sqrt(Math.max(1, queryVariance * templateVariance)) -
    (colorDifference / 3 / 255) * COLOR_PENALTY
  );
}

/** Squared error, weighted by how much two templates differ at each pixel. */
function differenceError(
  query: Float32Array,
  template: Float32Array,
  other: Float32Array,
  mask: Uint16Array,
) {
  let error = 0;
  let weight = 0;

  for (let m = 0; m < mask.length; m++) {
    const base = mask[m] * 3;

    for (let channel = 0; channel < 3; channel++) {
      const i = base + channel;
      const w = (template[i] - other[i]) ** 2;
      error += w * (query[i] - template[i]) ** 2;
      weight += w;
    }
  }

  return error / Math.max(1, weight);
}

/** The dark "6 day(s)" badge over the top of a card. */
function hasBadge(
  image: PixelImage,
  grid: InventoryGrid,
  column: number,
  rowY: number,
) {
  let dark = 0;
  let total = 0;
  const y = Math.round(rowY - grid.pitchY * 0.49);
  const step = Math.max(1, Math.round(grid.pitchX / 80));

  // Above the card, where there's only the gap between rows otherwise
  for (
    let x = Math.round(column - grid.pitchX * 0.3);
    x < column + grid.pitchX * 0.36;
    x += step
  ) {
    if (y < 0 || x < 0 || x >= image.width) {
      return false;
    }

    const i = (y * image.width + x) * 4;
    dark += Number(
      image.pixels[i] < 100 &&
        image.pixels[i + 1] < 110 &&
        image.pixels[i + 2] < 140,
    );
    total++;
  }

  return dark / Math.max(1, total) > 0.5;
}

export type CellMatches = Record<ScanParcelType, IconMatch | null>;

export function matchCellIcon(
  image: PixelImage,
  grid: InventoryGrid,
  column: number,
  rowY: number,
  templates: IconTemplates,
): CellMatches {
  const kind = hasBadge(image, grid, column, rowY) ? "badge" : "plain";
  const step = (grid.pitchX * ICON_WIDTH) / W / 2;
  const patch = resample(
    image,
    column + grid.pitchX * ICON_OFFSET_X - (PATCH_W / 2) * step,
    rowY + grid.pitchY * ICON_OFFSET_Y - (PATCH_H / 2) * step,
    step,
    PATCH_W,
    PATCH_H,
  );

  const coarseQueries: {
    dx: number;
    dy: number;
    query: Float32Array;
  }[] = [];

  for (let dy = -SEARCH; dy <= SEARCH; dy += 2) {
    for (let dx = -SEARCH; dx <= SEARCH; dx += 2) {
      coarseQueries.push({
        dx,
        dy,
        query: shrink(patch, MARGIN + dx, MARGIN + dy, 4, CW, CH),
      });
    }
  }

  const centralQueries = coarseQueries.filter(
    ({ dx, dy }) => Math.abs(dx) <= 1 && Math.abs(dy) <= 1,
  );
  const outerQueries = coarseQueries.filter(
    (query) => !centralQueries.includes(query),
  );

  // Fine queries are only made around where the coarse search found an icon
  const fineQueries = new Map<number, Float32Array>();
  const fineQuery = (dx: number, dy: number) => {
    const key = (dy + SEARCH) * (SEARCH * 2 + 1) + dx + SEARCH;
    let query = fineQueries.get(key);

    if (!query) {
      query = shrink(patch, MARGIN + dx, MARGIN + dy, 2, W, H);
      fineQueries.set(key, query);
    }

    return query;
  };

  const result: CellMatches = {
    Item: null,
    Equipment: null,
  };

  for (const parcelType of [
    "Item",
    "Equipment",
  ] as const) {
    const candidates: {
      icon: number;
      score: number;
      dx: number;
      dy: number;
    }[] = [];

    const bestOffset = (
      icon: number,
      queries: typeof coarseQueries,
      start: (typeof candidates)[number] | null,
    ) => {
      const mask = templates.coarseMasks[kind][icon];
      let best = start ?? {
        icon,
        score: Number.NEGATIVE_INFINITY,
        dx: 0,
        dy: 0,
      };

      for (const { dx, dy, query } of queries) {
        const score = similarity(query, templates.coarse[icon], mask);

        if (score > best.score) {
          best = {
            icon,
            score,
            dx,
            dy,
          };
        }
      }

      return best;
    };

    // Cells are close to where the grid puts them, so every icon is tried at
    // the middle offsets, and only the likeliest ones at all of them
    for (const [icon, { parcelType: type }] of templates.icons.entries()) {
      if (
        type === parcelType &&
        templates.coarseMasks[kind][icon].length >= 6
      ) {
        candidates.push(bestOffset(icon, centralQueries, null));
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    candidates.splice(SHORTLIST, candidates.length);

    for (const [i, candidate] of candidates.entries()) {
      candidates[i] = bestOffset(candidate.icon, outerQueries, candidate);
    }

    candidates.sort((a, b) => b.score - a.score);

    const fine = candidates
      .slice(0, FINE_CANDIDATES)
      .map(({ icon, dx: coarseX, dy: coarseY }) => {
        let score = Number.NEGATIVE_INFINITY;
        let query = fineQuery(coarseX, coarseY);

        for (
          let dy = Math.max(-SEARCH, coarseY - 1);
          dy <= Math.min(SEARCH, coarseY + 1);
          dy++
        ) {
          for (
            let dx = Math.max(-SEARCH, coarseX - 1);
            dx <= Math.min(SEARCH, coarseX + 1);
            dx++
          ) {
            const candidate = fineQuery(dx, dy);
            const value = similarity(
              candidate,
              templates.fine[icon],
              templates.fineMasks[kind][icon],
            );

            if (value > score) {
              score = value;
              query = candidate;
            }
          }
        }

        return {
          icon,
          score,
          query,
        };
      })
      .sort((a, b) => b.score - a.score);

    if (fine.length === 0) {
      continue;
    }

    // Icons that share most of their picture (the same book in other colors,
    // blueprints) are told apart only where they differ
    let best = fine[0];
    const rivals = fine
      .slice(1)
      .filter(({ score }) => fine[0].score - score <= CLOSE_SCORE);
    let margin = 1;

    for (const rival of rivals) {
      const a = templates.fine[best.icon];
      const b = templates.fine[rival.icon];
      const mask = templates.fineMasks[kind][best.icon];
      const bestError = differenceError(best.query, a, b, mask);
      const rivalError = differenceError(best.query, b, a, mask);

      margin = Math.min(
        margin,
        Math.abs(rivalError - bestError) / Math.max(1, rivalError + bestError),
      );

      if (rivalError < bestError) {
        best = rival;
      }
    }

    result[parcelType] = {
      icon: best.icon,
      score: best.score,
      margin,
    };
  }

  return result;
}
