import type { PvpPixelImage, PvpStudentIdentity } from "@/lib/pvp";

export const PVP_ICON_TEMPLATE_WIDTH = 48;
export const PVP_ICON_TEMPLATE_HEIGHT = 40;
export const PVP_ICON_SAMPLE_GRID_SIZE = 12;
export const PVP_ICON_SAMPLE_COUNT = PVP_ICON_SAMPLE_GRID_SIZE ** 2;
export const PVP_ICON_CATALOG_FORMAT = 1;
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
      for (let channel = 0; channel < 3; channel++) {
        let total = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const sx = Math.max(0, Math.min(image.width - 1, x + dx));
            const sy = Math.max(0, Math.min(image.height - 1, y + dy));

            total +=
              image.pixels[(sy * image.width + sx) * 4 + channel] *
              (dx === 0 ? 2 : 1) *
              (dy === 0 ? 2 : 1);
          }
        }

        pixels[(y * image.width + x) * 4 + channel] = total / 16;
      }
    }
  }

  return pixels;
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

  // Use the exact rounded coordinates stored by describePvpIcon, rather than
  // the ideal grid positions (which can differ by over a screenshot pixel).
  const points = pvpIconSamplePoints().map(({ u, v }) => ({
    u:
      Math.round(u * (PVP_ICON_TEMPLATE_WIDTH - 1)) /
      (PVP_ICON_TEMPLATE_WIDTH - 1),
    v:
      Math.round(v * (PVP_ICON_TEMPLATE_HEIGHT - 1)) /
      (PVP_ICON_TEMPLATE_HEIGHT - 1),
  }));

  const queries: Uint8Array[] = [];

  for (const sx of [0.75, 0.85, 0.95]) {
    for (const sy of [0.85, 0.95]) {
      for (const shear of [-0.18, 0]) {
        for (const dx of [-0.04, 0, 0.04]) {
          for (const dy of [-0.04, 0, 0.04]) {
            const query = new Uint8Array(points.length * 3);

            for (const [index, { u, v }] of points.entries()) {
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
              query.set(sampledPixels.subarray(offset, offset + 3), index * 3);
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

        if (templates[ti + 3] < 200) {
          continue;
        }

        for (let channel = 0; channel < 3; channel++) {
          const delta = templates[ti + channel] - query[pixel * 3 + channel];
          distance += delta * delta;
          count++;
        }
      }

      // Transparent or effectively empty templates must never score as matches.
      if (count >= points.length * 1.5) {
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
