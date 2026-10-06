import { createHash } from "node:crypto";
import { deflateSync, inflateSync } from "node:zlib";
import type { PvpPixelImage } from "@/lib/pvp";

export const NAME_FINGERPRINT_VERSION = 1;
export const NAME_MASK_HEIGHT = 48;
export const NAME_MASK_MAX_WIDTH = 768;

export type NameDescriptor = {
  version: number;
  hash: string;
  width: number;
  height: number;
  mask: string;
  perceptual: string;
  levelRemoved: boolean;
  reliable: boolean;
};

export function fingerprintName(
  image: PvpPixelImage,
  levelEnd?: number,
): NameDescriptor {
  const { width, height, pixels } = image;

  const gray = new Uint8Array(width * height);

  const histogram = new Uint32Array(256);

  for (let i = 0; i < gray.length; i++) {
    gray[i] = Math.round(
      pixels[i * 4] * 0.299 +
        pixels[i * 4 + 1] * 0.587 +
        pixels[i * 4 + 2] * 0.114,
    );

    histogram[gray[i]]++;
  }

  const percentile = (fraction: number) => {
    let count = 0;

    for (let i = 0; i < 256; i++) {
      count += histogram[i];
      if (count >= gray.length * fraction) {
        return i;
      }
    }

    return 255;
  };

  const dark = percentile(0.02);
  const background = percentile(0.75);

  const threshold = dark + (background - dark) * 0.45;
  const mask = new Uint8Array(gray.length);

  const start = levelEnd == null ? 0 : Math.ceil(levelEnd);

  for (let y = 0; y < height; y++) {
    let ink = 0;

    for (let x = start; x < width; x++) {
      const i = y * width + x;
      mask[i] = Number(gray[i] < threshold && pixels[i * 4 + 3] > 128);
      ink += mask[i];
    }

    if (y > height * 0.65 && ink > (width - start) * 0.7) {
      mask.fill(0, y * width, (y + 1) * width);
    }
  }

  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;

  for (let y = 0; y < height; y++) {
    for (let x = start; x < width; x++) {
      if (!mask[y * width + x]) {
        continue;
      }

      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }

  const sourceWidth = Math.max(1, right - left + 1);
  const sourceHeight = Math.max(1, bottom - top + 1);

  const targetHeight = NAME_MASK_HEIGHT;
  const targetWidth = Math.max(
    1,
    Math.min(
      NAME_MASK_MAX_WIDTH,
      Math.round((sourceWidth / sourceHeight) * targetHeight),
    ),
  );

  const normalized = new Uint8Array(targetWidth * targetHeight);

  let count = 0;

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const sx =
        left +
        Math.min(
          sourceWidth - 1,
          Math.floor(((x + 0.5) * sourceWidth) / targetWidth),
        );

      const sy =
        top +
        Math.min(
          sourceHeight - 1,
          Math.floor(((y + 0.5) * sourceHeight) / targetHeight),
        );

      normalized[y * targetWidth + x] = mask[sy * width + sx] || 0;
      count += normalized[y * targetWidth + x];
    }
  }

  const coarse = new Uint8Array(16);

  for (let cy = 0; cy < 8; cy++) {
    for (let cx = 0; cx < 16; cx++) {
      let n = 0;
      let ink = 0;

      for (
        let y = Math.floor((cy * targetHeight) / 8);
        y < Math.floor(((cy + 1) * targetHeight) / 8);
        y++
      ) {
        for (
          let x = Math.floor((cx * targetWidth) / 16);
          x < Math.floor(((cx + 1) * targetWidth) / 16);
          x++
        ) {
          n++;
          ink += normalized[y * targetWidth + x];
        }
      }

      if (n && ink / n > 0.2) {
        coarse[Math.floor((cy * 16 + cx) / 8)] |= 1 << (cx % 8);
      }
    }
  }

  const levelRemoved = levelEnd != null;

  const hash = createHash("sha256")
    .update(
      `pvp-name:${NAME_FINGERPRINT_VERSION}:${targetWidth}:${levelRemoved}:`,
    )
    .update(normalized)
    .digest("hex");

  return {
    version: NAME_FINGERPRINT_VERSION,
    hash,
    width: targetWidth,
    height: targetHeight,
    mask: deflateSync(normalized).toString("base64"),
    perceptual: Buffer.from(coarse).toString("hex"),
    levelRemoved,
    reliable:
      background - dark >= 35 &&
      sourceHeight >= 12 &&
      right >= left &&
      targetWidth < NAME_MASK_MAX_WIDTH &&
      count > 30,
  };
}

export function nameBuckets(descriptor: NameDescriptor) {
  return Array.from(
    { length: 8 },
    (_, band) =>
      `pvp_ocr_index_v${descriptor.version}_${Number(descriptor.levelRemoved)}_${band}_${descriptor.perceptual.slice(band * 4, band * 4 + 4)}`,
  );
}

export function decodeNameMask(
  descriptor: Pick<NameDescriptor, "mask" | "width" | "height">,
) {
  return inflateSync(Buffer.from(descriptor.mask, "base64"), {
    maxOutputLength: NAME_MASK_MAX_WIDTH * NAME_MASK_HEIGHT,
  });
}

export function verifyNameSimilarity(a: NameDescriptor, b: NameDescriptor) {
  if (
    !a.reliable ||
    !b.reliable ||
    a.version !== b.version ||
    a.levelRemoved !== b.levelRemoved ||
    a.height !== b.height
  ) {
    return false;
  }

  if (Math.abs(a.width - b.width) > Math.max(2, a.width * 0.025)) {
    return false;
  }

  const am = decodeNameMask(a);
  const bm = decodeNameMask(b);

  const componentCount = (mask: Buffer, width: number) => {
    const seen = new Uint8Array(mask.length);

    let count = 0;

    for (let start = 0; start < mask.length; start++) {
      if (!mask[start] || seen[start]) {
        continue;
      }

      const queue = [start];
      seen[start] = 1;

      for (let i = 0; i < queue.length; i++) {
        const x = queue[i] % width;
        const y = Math.floor(queue[i] / width);

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            const next = ny * width + nx;

            if (
              nx >= 0 &&
              nx < width &&
              ny >= 0 &&
              ny < NAME_MASK_HEIGHT &&
              mask[next] &&
              !seen[next]
            ) {
              seen[next] = 1;
              queue.push(next);
            }
          }
        }
      }

      if (queue.length >= 4) {
        count++;
      }
    }

    return count;
  };

  if (componentCount(am, a.width) !== componentCount(bm, b.width)) {
    return false;
  }

  const nearInk = (mask: Buffer, width: number, x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;

        if (
          nx >= 0 &&
          nx < width &&
          ny >= 0 &&
          ny < NAME_MASK_HEIGHT &&
          mask[ny * width + nx]
        ) {
          return true;
        }
      }
    }

    return false;
  };

  for (let left = 0; left < a.width; left += 8) {
    let ai = 0;
    let bi = 0;

    let distant = 0;

    for (let y = 0; y < a.height; y++) {
      for (let x = left; x < Math.min(left + 8, a.width); x++) {
        const bx = Math.min(
          b.width - 1,
          Math.round((x * (b.width - 1)) / Math.max(1, a.width - 1)),
        );

        const av = am[y * a.width + x] || 0;
        const bv = bm[y * b.width + bx] || 0;

        ai += av;
        bi += bv;

        if (av && !nearInk(bm, b.width, bx, y)) {
          distant++;
        }

        if (bv && !nearInk(am, a.width, x, y)) {
          distant++;
        }
      }
    }

    if (
      Math.abs(ai - bi) > Math.max(2, Math.max(ai, bi) * 0.2) ||
      distant > Math.max(1, Math.floor((ai + bi) * 0.02))
    ) {
      return false;
    }
  }

  return true;
}
