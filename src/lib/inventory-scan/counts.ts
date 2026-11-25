import glyphData from "@/lib/inventory-scan/count-glyphs.json";
import { resample } from "@/lib/inventory-scan/resample";
import type {
  CountReading,
  InventoryGrid,
  PixelImage,
} from "@/lib/inventory-scan/types";

// The strip of a cell that holds the count, scaled so that the column pitch is
// `REFERENCE_PITCH`. The glyph templates were cut from strips like these
const REFERENCE_PITCH = 165.6;
const STRIP_X = -45;
const STRIP_Y = 34;
const STRIP_WIDTH = 120;
const STRIP_HEIGHT = 40;

// Straightens the slanted text
const SLANT = 0.2;

// Dark navy, outlined in white
const TEXT_COLOR = [
  44,
  62,
  88,
];
const TEXT_TOLERANCE = 130;

const MAX_DIGITS = 4;

const SEARCH_X = 3;
const SEARCH_Y = 2;

// How dark connected pixels have to be to count as part of the icon
const ART_DARKNESS = 0.2;

// The card under the mouse cursor is drawn smaller
const PRESSED_SCALES = [
  0.97,
  0.94,
];
const RETRY_SCORE = 0.8;

// Cells read to find out which font a screenshot uses
const FONT_SAMPLES = 10;

// The font of the previous screenshot is kept when its counts read this well
const SAME_FONT_SCORE = 0.85;

let lastFont: CountFont | null = null;

function normalize(values: Float32Array) {
  let mean = 0;

  for (const value of values) {
    mean += value;
  }

  mean /= values.length;

  let norm = 0;

  for (let i = 0; i < values.length; i++) {
    values[i] -= mean;
    norm += values[i] * values[i];
  }

  norm = Math.sqrt(norm) + 1e-6;

  for (let i = 0; i < values.length; i++) {
    values[i] /= norm;
  }

  return values;
}

type Glyph = {
  character: string;
  /** How wide the character is, including the space around it */
  advance: number;
  pixels: Float32Array;
};

/**
 * The game's font depends on its language, and on the client. Counts are
 * right-aligned.
 */
type Slot = {
  advance: number;
  glyphs: Glyph[];
};

type Reading = {
  glyph: Glyph;
  score: number;
};

export type CountFont = {
  width: number;
  height: number;
  /** Where the text ends, and the top of the glyphs, in the strip */
  right: number;
  top: number;
  k: Glyph;
  /** The digits and the "x", grouped by how wide they are */
  slots: Slot[];
};

function decodeGlyph(data: string) {
  return normalize(
    Float32Array.from(atob(data), (byte) => byte.charCodeAt(0) / 255),
  );
}

// The thin English "K" is the Japanese one, until there's a screenshot of it
const FONTS: CountFont[] = glyphData.fonts.map(
  ({ width, height, right, top, advances, glyphs }) => {
    const all = Object.entries(glyphs).map(
      ([character, data]): Glyph => ({
        character,
        advance: advances[character as keyof typeof advances],
        pixels: decodeGlyph(data),
      }),
    );

    const slots = all.filter(({ character }) => character !== "K");

    return {
      width,
      height,
      right,
      top,
      k: all.find(({ character }) => character === "K") as Glyph,
      slots: [
        ...new Set(slots.map(({ advance }) => advance)),
      ].map((advance) => ({
        advance,
        glyphs: slots.filter((glyph) => glyph.advance === advance),
      })),
    };
  },
);

/**
 * Clears the dark parts of the icon behind the count. The count's white outline
 * keeps them apart from it, so they're what is connected to the strip's top.
 */
function eraseArt(darkness: Float32Array) {
  const stack = Array.from(
    {
      length: STRIP_WIDTH,
    },
    (_, x) => x,
  );

  for (let i = stack.pop(); i !== undefined; i = stack.pop()) {
    if (darkness[i] < ART_DARKNESS) {
      continue;
    }

    darkness[i] = 0;
    const x = i % STRIP_WIDTH;

    if (x > 0) {
      stack.push(i - 1);
    }

    if (x < STRIP_WIDTH - 1) {
      stack.push(i + 1);
    }

    if (i >= STRIP_WIDTH) {
      stack.push(i - STRIP_WIDTH);
    }

    if (i + STRIP_WIDTH < darkness.length) {
      stack.push(i + STRIP_WIDTH);
    }
  }
}

function readStrip(
  image: PixelImage,
  grid: InventoryGrid,
  column: number,
  rowY: number,
  cardScale: number,
) {
  const scale = (grid.pitchX / REFERENCE_PITCH) * cardScale;
  const strip = resample(
    image,
    column + STRIP_X * scale,
    rowY + STRIP_Y * scale,
    scale,
    STRIP_WIDTH,
    STRIP_HEIGHT,
  );

  const darkness = new Float32Array(STRIP_WIDTH * STRIP_HEIGHT);

  for (let i = 0; i < darkness.length; i++) {
    const distance = Math.hypot(
      strip[i * 3] - TEXT_COLOR[0],
      strip[i * 3 + 1] - TEXT_COLOR[1],
      strip[i * 3 + 2] - TEXT_COLOR[2],
    );

    darkness[i] = Math.max(0, 1 - distance / TEXT_TOLERANCE);
  }

  eraseArt(darkness);

  const straight = new Float32Array(darkness.length);

  for (let y = 0; y < STRIP_HEIGHT; y++) {
    const shift = SLANT * (STRIP_HEIGHT / 2 - y);

    for (let x = 0; x < STRIP_WIDTH; x++) {
      const sx = x + shift;
      const x0 = Math.floor(sx);
      const fraction = sx - x0;

      if (x0 >= 0 && x0 + 1 < STRIP_WIDTH) {
        const i = y * STRIP_WIDTH + x0;
        straight[y * STRIP_WIDTH + x] =
          darkness[i] * (1 - fraction) + darkness[i + 1] * fraction;
      }
    }
  }

  return straight;
}

function glyphWindow(
  strip: Float32Array,
  x: number,
  y: number,
  { width, height }: CountFont,
) {
  const x0 = Math.floor(x);
  const fraction = x - x0;

  if (
    x0 < 0 ||
    y < 0 ||
    x0 + width >= STRIP_WIDTH ||
    y + height > STRIP_HEIGHT
  ) {
    return null;
  }

  const values = new Float32Array(width * height);

  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const i = (y + dy) * STRIP_WIDTH + x0 + dx;
      values[dy * width + dx] =
        strip[i] * (1 - fraction) + strip[i + 1] * fraction;
    }
  }

  return normalize(values);
}

function correlate(a: Float32Array, b: Float32Array) {
  let total = 0;

  for (let i = 0; i < a.length; i++) {
    total += a[i] * b[i];
  }

  return total;
}

function readText(strip: Float32Array, font: CountFont) {
  let best = {
    text: "",
    score: 0,
  };

  // The search tries the same places many times over, so the best glyph at
  // each place is kept. Places are rounded to an eighth of a pixel
  const seen = new Map<number, Reading | null>();

  const readAt = (x: number, y: number, slots: Slot[]) => {
    const key =
      (Math.round(x * 8) * 64 + y + 32) * 2 + (slots === kSlots ? 1 : 0);
    const known = seen.get(key);

    if (known !== undefined) {
      return known;
    }

    let found: Reading | null = null;

    for (const { advance, glyphs } of slots) {
      const window = glyphWindow(
        strip,
        x - (advance + font.width) / 2,
        y,
        font,
      );

      if (!window) {
        continue;
      }

      for (const glyph of glyphs) {
        const value = correlate(window, glyph.pixels);

        if (!found || value > found.score) {
          found = {
            glyph,
            score: value,
          };
        }
      }
    }

    seen.set(key, found);
    return found;
  };

  const kSlots: Slot[] = [
    {
      advance: font.k.advance,
      glyphs: [
        font.k,
      ],
    },
  ];

  for (let dy = -SEARCH_Y; dy <= SEARCH_Y; dy++) {
    for (let dx = -SEARCH_X; dx <= SEARCH_X; dx += 0.5) {
      for (const thousands of [
        false,
        true,
      ]) {
        let right = font.right;
        let text = "";
        const scores: number[] = [];

        if (thousands) {
          const k = readAt(right + dx, font.top + dy, kSlots);

          if (!k) {
            continue;
          }

          scores.push(k.score);
          right -= font.k.advance;
        }

        // Read leftwards until the "x"
        for (let digits = 0; digits <= MAX_DIGITS; digits++) {
          const reading = readAt(right + dx, font.top + dy, font.slots);

          if (!reading) {
            break;
          }

          const { glyph: found, score } = reading;
          scores.push(score);

          if (found.character === "x") {
            const total = scores.reduce((sum, value) => sum + value, 0);
            const overall = (Math.min(...scores) + total / scores.length) / 2;

            if (digits > 0 && overall > best.score) {
              best = {
                text: thousands ? `${text}K` : text,
                score: overall,
              };
            }

            break;
          }

          text = found.character + text;
          right -= found.advance;
        }
      }
    }
  }

  return best;
}

/** The font that the counts of a screenshot are most readable as. */
export function detectCountFont(
  image: PixelImage,
  grid: InventoryGrid,
  cells: {
    column: number;
    rowY: number;
  }[],
) {
  const strips = cells
    .slice(0, FONT_SAMPLES)
    .map(({ column, rowY }) => readStrip(image, grid, column, rowY, 1));

  // Frames of a video all use the same font
  if (lastFont && strips.length > 0) {
    const score = strips.reduce(
      (total, strip) => total + readText(strip, lastFont as CountFont).score,
      0,
    );

    if (score / strips.length >= SAME_FONT_SCORE) {
      return lastFont;
    }
  }

  let best = FONTS[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const font of FONTS) {
    const score = strips.reduce(
      (total, strip) => total + readText(strip, font).score,
      0,
    );

    if (score > bestScore) {
      best = font;
      bestScore = score;
    }
  }

  lastFont = best;
  return best;
}

export function readCellCount(
  image: PixelImage,
  grid: InventoryGrid,
  column: number,
  rowY: number,
  font: CountFont,
): CountReading {
  let best = readText(readStrip(image, grid, column, rowY, 1), font);

  if (best.score < RETRY_SCORE) {
    for (const scale of PRESSED_SCALES) {
      const attempt = readText(
        readStrip(image, grid, column, rowY, scale),
        font,
      );

      if (attempt.score > best.score) {
        best = attempt;
      }
    }
  }

  if (!best.text) {
    return {
      value: null,
      approximate: false,
      score: 0,
    };
  }

  const approximate = best.text.endsWith("K");

  return {
    value: Number.parseInt(best.text, 10) * (approximate ? 1000 : 1),
    approximate,
    score: best.score,
  };
}
