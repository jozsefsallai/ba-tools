import { createHash } from "node:crypto";
import {
  PVP_ICON_CATALOG_FORMAT,
  PVP_ICON_TEMPLATE_HEIGHT,
  PVP_ICON_TEMPLATE_WIDTH,
  describePvpIcon,
} from "@/lib/pvp/icon-match";
import { ResizeFit, Transformer } from "@napi-rs/image";

// Change this when rendering changes, even if the descriptor wire size does not
export const PVP_ICON_PREPROCESSING_VERSION = 2;

export function pvpIconDescriptorCacheKey(url: string, background: Uint8Array) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        url,
        PVP_ICON_PREPROCESSING_VERSION,
        PVP_ICON_CATALOG_FORMAT,
      ]),
    )
    .update(background)
    .digest("hex");
}

export function compositePvpIconPixels(
  background: Uint8Array,
  portrait: Uint8Array,
) {
  if (background.length !== portrait.length || background.length % 4 !== 0) {
    throw new Error("Invalid icon composition dimensions");
  }

  const pixels = new Uint8ClampedArray(background.length);

  for (let i = 0; i < pixels.length; i += 4) {
    const foregroundAlpha = portrait[i + 3] / 255;
    const backgroundAlpha = (background[i + 3] / 255) * (1 - foregroundAlpha);
    const alpha = foregroundAlpha + backgroundAlpha;

    for (let channel = 0; channel < 3; channel++) {
      pixels[i + channel] = alpha
        ? (portrait[i + channel] * foregroundAlpha +
            background[i + channel] * backgroundAlpha) /
          alpha
        : 0;
    }

    pixels[i + 3] = alpha * 255;
  }

  return pixels;
}

export function describePvpIconReference(
  portrait: Uint8Array,
  background: Uint8Array,
) {
  const width = PVP_ICON_TEMPLATE_WIDTH * 5;
  const height = PVP_ICON_TEMPLATE_HEIGHT * 5;

  const cover = (input: Uint8Array) =>
    new Transformer(input)
      .resize({ width, height, fit: ResizeFit.Cover })
      .opacity(1)
      .rawPixelsSync();

  const pixels = compositePvpIconPixels(cover(background), cover(portrait));

  return describePvpIcon(
    Transformer.fromRgbaPixels(pixels, width, height)
      .resize({
        width: PVP_ICON_TEMPLATE_WIDTH,
        height: PVP_ICON_TEMPLATE_HEIGHT,
        fit: ResizeFit.Fill,
      })
      .rawPixelsSync(),
  );
}
