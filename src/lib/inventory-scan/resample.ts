import type { PixelImage } from "@/lib/inventory-scan/types";

/** Area-averaged resampling of a part of the screenshot. */
export function resample(
  image: PixelImage,
  left: number,
  top: number,
  step: number,
  width: number,
  height: number,
) {
  const output = new Float32Array(width * height * 3);
  const samples = Math.max(1, Math.ceil(step));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 3;

      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const px = left + (x + (sx + 0.5) / samples) * step - 0.5;
          const py = top + (y + (sy + 0.5) / samples) * step - 0.5;

          const x0 = Math.max(0, Math.min(image.width - 2, Math.floor(px)));
          const y0 = Math.max(0, Math.min(image.height - 2, Math.floor(py)));
          const fx = Math.max(0, Math.min(1, px - x0));
          const fy = Math.max(0, Math.min(1, py - y0));
          const i = (y0 * image.width + x0) * 4;
          const row = image.width * 4;

          for (let channel = 0; channel < 3; channel++) {
            output[o + channel] +=
              image.pixels[i + channel] * (1 - fx) * (1 - fy) +
              image.pixels[i + 4 + channel] * fx * (1 - fy) +
              image.pixels[i + row + channel] * (1 - fx) * fy +
              image.pixels[i + row + 4 + channel] * fx * fy;
          }
        }
      }

      for (let channel = 0; channel < 3; channel++) {
        output[o + channel] /= samples * samples;
      }
    }
  }

  return output;
}
