import type { PvpPixelImage, PvpStudentIdentity } from "@/lib/pvp";
import { PVP_ICON_CARD_BOUNDS } from "@/lib/pvp/icon-card";
import { PVP_ICON_CATALOG_FORMAT } from "@/lib/pvp/icon-catalog-format";

export { PVP_ICON_CATALOG_FORMAT };

export const PVP_ICON_TEMPLATE_WIDTH = 48;
export const PVP_ICON_TEMPLATE_HEIGHT = 40;
export const PVP_ICON_SAMPLE_GRID_SIZE = 12;
export const PVP_ICON_SAMPLE_COUNT = PVP_ICON_SAMPLE_GRID_SIZE ** 2;
export const PVP_ICON_TEMPLATE_BYTES = PVP_ICON_SAMPLE_COUNT * 4;

export type PvpIconCatalog = {
  format: typeof PVP_ICON_CATALOG_FORMAT;
  asset: string;
  students: PvpStudentIdentity[];
};

export type PvpIconMatch = {
  studentId: string | null;
  candidates: { studentId: string; distance: number }[];
  margin: number;
  confidence: number;
  uncertain: boolean;
};

export function pvpIconSamplePoints() {
  return Array.from({ length: PVP_ICON_SAMPLE_COUNT }, (_, index) => ({
    u:
      0.2 +
      ((index % PVP_ICON_SAMPLE_GRID_SIZE) * 0.6) /
        (PVP_ICON_SAMPLE_GRID_SIZE - 1),
    v:
      0.12 +
      (Math.floor(index / PVP_ICON_SAMPLE_GRID_SIZE) * 0.76) /
        (PVP_ICON_SAMPLE_GRID_SIZE - 1),
  }));
}

export function describePvpIcon(pixels: Uint8Array | Uint8ClampedArray) {
  if (
    pixels.length !==
    PVP_ICON_TEMPLATE_WIDTH * PVP_ICON_TEMPLATE_HEIGHT * 4
  ) {
    throw new Error("Invalid student icon template dimensions");
  }

  const descriptor = new Uint8Array(PVP_ICON_TEMPLATE_BYTES);

  for (const [index, { u, v }] of pvpIconSamplePoints().entries()) {
    const offset =
      (Math.round(v * (PVP_ICON_TEMPLATE_HEIGHT - 1)) *
        PVP_ICON_TEMPLATE_WIDTH +
        Math.round(u * (PVP_ICON_TEMPLATE_WIDTH - 1))) *
      4;
    descriptor.set(pixels.subarray(offset, offset + 4), index * 4);
  }

  return descriptor;
}

// Catalog pixels are downsampled during preparation. Smooth screenshot pixels
// slightly too, so a single sharp eye/hair edge cannot dominate sparse samples.
function smoothPvpIcon(image: PvpPixelImage) {
  const pixels = new Uint8ClampedArray(image.pixels.length);

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const target = (y * image.width + x) * 4;
      pixels[target + 3] = image.pixels[target + 3];

      if (pixels[target + 3] < 200) {
        continue;
      }

      for (let channel = 0; channel < 3; channel++) {
        let total = 0;
        let weight = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const sx = Math.max(0, Math.min(image.width - 1, x + dx));
            const sy = Math.max(0, Math.min(image.height - 1, y + dy));

            const source = (sy * image.width + sx) * 4;

            if (image.pixels[source + 3] < 200) {
              continue;
            }

            const contribution = (dx === 0 ? 2 : 1) * (dy === 0 ? 2 : 1);
            total += image.pixels[source + channel] * contribution;
            weight += contribution;
          }
        }

        pixels[target + channel] = total / weight;
      }
    }
  }

  return pixels;
}

function samplePvpIcon(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  output: Uint8Array,
  offset: number,
) {
  if (x < 0 || y < 0 || x > width - 1 || y > height - 1) {
    return;
  }

  const left = Math.floor(x);
  const top = Math.floor(y);
  const right = Math.min(width - 1, left + 1);
  const bottom = Math.min(height - 1, top + 1);

  const fx = x - left;
  const fy = y - top;

  const neighbors = [
    [left, top, (1 - fx) * (1 - fy)],
    [right, top, fx * (1 - fy)],
    [left, bottom, (1 - fx) * fy],
    [right, bottom, fx * fy],
  ];

  let weight = 0;
  const rgb = [0, 0, 0];

  for (const [px, py, contribution] of neighbors) {
    const source = (py * width + px) * 4;

    if (pixels[source + 3] < 200) {
      continue;
    }

    weight += contribution;

    for (let channel = 0; channel < 3; channel++) {
      rgb[channel] += pixels[source + channel] * contribution;
    }
  }

  if (weight < 0.999) {
    return;
  }

  for (let channel = 0; channel < 3; channel++) {
    output[offset + channel] = Math.round(rgb[channel] / weight);
  }

  output[offset + 3] = 255;
}

export function matchPvpIcon(
  image: PvpPixelImage,
  catalog: PvpIconCatalog,
  templates: Uint8Array,
  allowedIds?: ReadonlySet<string>,
): PvpIconMatch {
  if (templates.length !== catalog.students.length * PVP_ICON_TEMPLATE_BYTES) {
    throw new Error("Student icon catalog/template mismatch");
  }

  if (image.pixels.length !== image.width * image.height * 4) {
    throw new Error("Invalid screenshot icon dimensions");
  }

  const sampledPixels = smoothPvpIcon(image);

  const card = image.iconCard
    ? PVP_ICON_CARD_BOUNDS[image.iconCard]
    : undefined;

  const points = pvpIconSamplePoints().map(({ u, v }) => ({
    u: card
      ? (Math.round(u * (PVP_ICON_TEMPLATE_WIDTH - 1)) + 0.5) /
        PVP_ICON_TEMPLATE_WIDTH
      : Math.round(u * (PVP_ICON_TEMPLATE_WIDTH - 1)) /
        (PVP_ICON_TEMPLATE_WIDTH - 1),
    v: card
      ? (Math.round(v * (PVP_ICON_TEMPLATE_HEIGHT - 1)) + 0.5) /
        PVP_ICON_TEMPLATE_HEIGHT
      : Math.round(v * (PVP_ICON_TEMPLATE_HEIGHT - 1)) /
        (PVP_ICON_TEMPLATE_HEIGHT - 1),
  }));

  const queries: Uint8Array[] = [];

  const scalesX = card ? [0.97, 1, 1.03] : [0.75, 0.85, 0.95];
  const scalesY = card ? [0.97, 1, 1.03] : [0.85, 0.95];
  const shears = card ? [0] : [-0.18, 0];
  const shifts = card ? [-0.02, -0.01, 0, 0.01, 0.02] : [-0.04, 0, 0.04];

  for (const sx of scalesX) {
    for (const sy of scalesY) {
      for (const shear of shears) {
        for (const dx of shifts) {
          for (const dy of shifts) {
            const query = new Uint8Array(points.length * 4);

            for (const [index, { u, v }] of points.entries()) {
              if (card) {
                const x =
                  image.width *
                    (card.x + card.width * (0.5 + (u - 0.5) * sx) + dx) -
                  0.5;

                const y =
                  image.height *
                    (card.y + card.height * (0.5 + (v - 0.5) * sy) + dy) -
                  0.5;

                samplePvpIcon(
                  sampledPixels,
                  image.width,
                  image.height,
                  x,
                  y,
                  query,
                  index * 4,
                );
              } else {
                const x = Math.max(
                  0,
                  Math.min(
                    image.width - 1,
                    Math.round(
                      image.width *
                        (0.5 + (u - 0.5) * sx + shear * (v - 0.5) + dx),
                    ),
                  ),
                );
                const y = Math.max(
                  0,
                  Math.min(
                    image.height - 1,
                    Math.round(image.height * (0.5 + (v - 0.5) * sy + dy)),
                  ),
                );
                const offset = (y * image.width + x) * 4;
                query.set(
                  sampledPixels.subarray(offset, offset + 4),
                  index * 4,
                );
              }
            }

            queries.push(query);
          }
        }
      }
    }
  }

  const candidates: PvpIconMatch["candidates"] = [];

  for (const [index, student] of catalog.students.entries()) {
    if (allowedIds && !allowedIds.has(student.id)) {
      continue;
    }

    const offset = index * PVP_ICON_TEMPLATE_BYTES;
    let best = Number.POSITIVE_INFINITY;

    for (const query of queries) {
      let distance = 0;
      let count = 0;

      for (let pixel = 0; pixel < points.length; pixel++) {
        const ti = offset + pixel * 4;

        if (templates[ti + 3] < 200 || query[pixel * 4 + 3] < 200) {
          continue;
        }

        for (let channel = 0; channel < 3; channel++) {
          const delta = templates[ti + channel] - query[pixel * 4 + channel];
          distance += delta * delta;
          count++;
        }
      }

      if (count / 3 >= Math.ceil(points.length / 2)) {
        best = Math.min(best, Math.sqrt(distance / count));
      }
    }

    if (Number.isFinite(best)) {
      candidates.push({ studentId: student.id, distance: best });
    }
  }

  candidates.sort((a, b) => a.distance - b.distance);

  const best = candidates[0];
  const second = candidates[1];

  const margin =
    best && second
      ? (second.distance - best.distance) / Math.max(1, second.distance)
      : 0;

  const studentId = best && best.distance <= 55 ? best.studentId : null;

  return {
    studentId,
    candidates: candidates.slice(0, 4),
    margin,
    confidence: best ? Math.max(0, 100 * (1 - best.distance / 255)) : 0,
    uncertain: !studentId || !best || best.distance > 40 || margin < 0.1,
  };
}
