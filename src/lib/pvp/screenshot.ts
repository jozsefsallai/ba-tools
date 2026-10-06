import { drawPvpPixels } from "@/lib/pvp/canvas";
import {
  type PVPScreenshotROIImages,
  type PVPScreenshotROIs,
  PVP_SCREENSHOT_REGIONS,
  PVP_SCREENSHOT_ROI_BOUNDS,
} from "@/lib/pvp/screenshot-types";

type DetectedRegion = {
  end: number;
  start: number;
};

type LuminanceMap = {
  height: number;
  scale: number;
  values: Float32Array;
  width: number;
};

const MAX_ANALYSIS_SIZE = 900;
const OUTPUT_WIDTH = 1920;

export { PVP_SCREENSHOT_ROI_BOUNDS } from "@/lib/pvp/screenshot-types";

export type {
  PVPScreenshotROIs,
  PVPScreenshotROIImages,
} from "@/lib/pvp/screenshot-types";

function createLuminanceMap(image: HTMLImageElement): LuminanceMap {
  const scale = Math.min(
    1,
    MAX_ANALYSIS_SIZE / Math.max(image.naturalWidth, image.naturalHeight),
  );

  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas rendering is unavailable.");
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const pixels = context.getImageData(0, 0, width, height).data;
  const values = new Float32Array(width * height);

  for (let index = 0; index < values.length; index += 1) {
    const pixel = index * 4;

    values[index] =
      pixels[pixel] * 0.2126 +
      pixels[pixel + 1] * 0.7152 +
      pixels[pixel + 2] * 0.0722;
  }

  return {
    height,
    scale,
    values,
    width,
  };
}

function getAxisAverages(
  map: LuminanceMap,
  axis: "column" | "row",
  start: number,
  end: number,
) {
  const length = axis === "row" ? map.height : map.width;
  const averages = new Float32Array(length);

  for (let index = 0; index < length; index += 1) {
    let total = 0;

    if (axis === "row") {
      for (let x = start; x < end; x += 1) {
        total += map.values[index * map.width + x];
      }
    } else {
      for (let y = start; y < end; y += 1) {
        total += map.values[y * map.width + index];
      }
    }

    averages[index] = total / Math.max(1, end - start);
  }

  return averages;
}

function getPercentile(values: Float32Array, percentile: number) {
  const sorted = Array.from(values).sort((a, b) => a - b);

  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((sorted.length - 1) * percentile)),
  );

  return sorted[index];
}

function getAverage(values: Float32Array, start: number, end: number) {
  let total = 0;

  for (let index = start; index < end; index += 1) {
    total += values[index];
  }

  return total / Math.max(1, end - start);
}

function findTransition(
  values: Float32Array,
  center: number,
  direction: "brighten" | "darken",
) {
  const window = Math.max(2, Math.min(24, Math.round(values.length * 0.01)));

  const searchRadius = window * 3;
  const searchStart = Math.max(window, center - searchRadius);
  const searchEnd = Math.min(values.length - window, center + searchRadius);

  let bestIndex = center;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let index = searchStart; index <= searchEnd; index += 1) {
    const change =
      getAverage(values, index, index + window) -
      getAverage(values, index - window, index);

    const score = direction === "brighten" ? change : -change;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function findContrastRegion(
  values: Float32Array,
  minimumSpan: number,
): DetectedRegion {
  const window = Math.max(2, Math.min(24, Math.round(values.length * 0.01)));

  const prefix = new Float64Array(values.length + 1);

  for (let index = 0; index < values.length; index += 1) {
    prefix[index + 1] = prefix[index] + values[index];
  }

  const average = (start: number, end: number) =>
    (prefix[end] - prefix[start]) / Math.max(1, end - start);

  let bestRegion: DetectedRegion | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (
    let start = window;
    start < values.length - minimumSpan - window;
    start += 1
  ) {
    const brighten =
      average(start, start + window) - average(start - window, start);

    if (brighten <= 0) {
      continue;
    }

    for (
      let end = start + minimumSpan;
      end < values.length - window;
      end += 1
    ) {
      const darken = average(end - window, end) - average(end, end + window);

      if (darken <= 0) {
        continue;
      }

      const inside = average(start + window, end - window);
      const outside = (average(0, start) + average(end, values.length)) / 2;
      const score = brighten + darken + Math.max(0, inside - outside) * 0.5;

      if (score > bestScore) {
        bestScore = score;
        bestRegion = { end, start };
      }
    }
  }

  if (!bestRegion) {
    throw new Error("No modal contrast region was detected.");
  }

  const refinedRegion = {
    end: findTransition(values, bestRegion.end, "darken"),
    start: findTransition(values, bestRegion.start, "brighten"),
  };

  return refinedRegion.end > refinedRegion.start ? refinedRegion : bestRegion;
}

function getBrightRegion(
  values: Float32Array,
  minimumSpan: number,
): DetectedRegion {
  const low = getPercentile(values, 0.1);
  const high = getPercentile(values, 0.9);

  const threshold = low + (high - low) * 0.42;

  let bestRegion: DetectedRegion | null = null;
  let currentStart = -1;

  for (let index = 0; index <= values.length; index += 1) {
    const isBright = index < values.length && values[index] >= threshold;

    if (isBright && currentStart === -1) {
      currentStart = index;
    }

    if ((!isBright || index === values.length) && currentStart !== -1) {
      const region = { end: index, start: currentStart };

      if (
        region.end - region.start >= minimumSpan &&
        (!bestRegion ||
          region.end - region.start > bestRegion.end - bestRegion.start)
      ) {
        bestRegion = region;
      }

      currentStart = -1;
    }
  }

  if (!bestRegion || high - low < 12) {
    return findContrastRegion(values, minimumSpan);
  }

  const refinedRegion = {
    end: findTransition(values, bestRegion.end, "darken"),
    start: findTransition(values, bestRegion.start, "brighten"),
  };

  return refinedRegion.end > refinedRegion.start
    ? refinedRegion
    : findContrastRegion(values, minimumSpan);
}

function detectModalBounds(image: HTMLImageElement) {
  const map = createLuminanceMap(image);

  const rowAverages = getAxisAverages(map, "row", 0, map.width);

  const detectedVerticalRegion = getBrightRegion(
    rowAverages,
    Math.round(map.height * 0.2),
  );

  const verticalRegion =
    detectedVerticalRegion.end - detectedVerticalRegion.start >=
    map.height * 0.5
      ? detectedVerticalRegion
      : findContrastRegion(rowAverages, Math.round(map.height * 0.5));

  const columnAverages = getAxisAverages(
    map,
    "column",
    verticalRegion.start,
    verticalRegion.end,
  );

  const detectedHorizontalRegion = getBrightRegion(
    columnAverages,
    Math.round(map.width * 0.2),
  );

  const horizontalRegion =
    detectedHorizontalRegion.end - detectedHorizontalRegion.start >=
    map.width * 0.7
      ? detectedHorizontalRegion
      : findContrastRegion(columnAverages, Math.round(map.width * 0.7));

  return {
    bottom: Math.round(verticalRegion.end / map.scale),
    left: Math.round(horizontalRegion.start / map.scale),
    right: Math.round(horizontalRegion.end / map.scale),
    top: Math.round(verticalRegion.start / map.scale),
  };
}

async function getCroppedScreenshot(
  sourceUrl: string,
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      try {
        const bounds = detectModalBounds(image);

        const left = Math.max(0, Math.min(image.naturalWidth - 1, bounds.left));
        const top = Math.max(0, Math.min(image.naturalHeight - 1, bounds.top));
        const right = Math.max(
          left + 1,
          Math.min(image.naturalWidth, bounds.right),
        );
        const bottom = Math.max(
          top + 1,
          Math.min(image.naturalHeight, bounds.bottom),
        );

        const cropWidth = Math.max(1, right - left);
        const cropHeight = Math.max(1, bottom - top);
        const cropCanvas = document.createElement("canvas");
        const cropContext = cropCanvas.getContext("2d");

        if (!cropContext) {
          throw new Error("Canvas rendering is unavailable.");
        }

        cropCanvas.width = cropWidth;
        cropCanvas.height = cropHeight;
        cropContext.drawImage(
          image,
          left,
          top,
          cropWidth,
          cropHeight,
          0,
          0,
          cropWidth,
          cropHeight,
        );

        const outputHeight = Math.max(
          1,
          Math.round((cropHeight / cropWidth) * OUTPUT_WIDTH),
        );
        const resizedCanvas = document.createElement("canvas");
        const resizedContext = resizedCanvas.getContext("2d");

        if (!resizedContext) {
          throw new Error("Canvas rendering is unavailable.");
        }

        resizedCanvas.width = OUTPUT_WIDTH;
        resizedCanvas.height = outputHeight;
        resizedContext.imageSmoothingEnabled = true;
        resizedContext.imageSmoothingQuality = "high";
        resizedContext.drawImage(
          cropCanvas,
          0,
          0,
          cropWidth,
          cropHeight,
          0,
          0,
          OUTPUT_WIDTH,
          outputHeight,
        );

        resolve(resizedCanvas);
      } catch (error) {
        reject(error);
      }
    };

    image.onerror = (err) => {
      reject(err);
    };

    image.src = sourceUrl;
  });
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  errorMessage = "Failed to encode screenshot modal",
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(errorMessage));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      0.95,
    );
  });
}

export async function getScreenshotModal(input: File): Promise<Blob> {
  const sourceUrl = URL.createObjectURL(input);

  try {
    return await encodeCanvas(await getCroppedScreenshot(sourceUrl));
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function getROI(
  screenshot: HTMLCanvasElement,
  area: readonly number[],
): Uint8ClampedArray {
  const [left, top, width, height] = area;

  const context = screenshot.getContext("2d");

  if (!context) {
    throw new Error("Failed to get canvas context");
  }

  const imageData = context.getImageData(left, top, width, height);
  return new Uint8ClampedArray(imageData.data);
}

function encodeROI(
  pixels: Uint8ClampedArray,
  area: readonly number[],
): Promise<Blob> {
  const [, , width, height] = area;

  const canvas = document.createElement("canvas");
  if (!drawPvpPixels(canvas, { width, height, pixels })) {
    return Promise.reject(new Error("Failed to get canvas context"));
  }

  return encodeCanvas(canvas, "Failed to encode screenshot region");
}

export async function getScreenshotROIs(
  input: File,
): Promise<PVPScreenshotROIs> {
  const sourceUrl = URL.createObjectURL(input);

  try {
    const screenshot = await getCroppedScreenshot(sourceUrl);

    return Object.fromEntries(
      PVP_SCREENSHOT_REGIONS.map((region) => [
        region,
        getROI(screenshot, PVP_SCREENSHOT_ROI_BOUNDS[region]),
      ]),
    ) as PVPScreenshotROIs;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export async function getScreenshotROIImages(
  input: File,
): Promise<PVPScreenshotROIImages> {
  const rois = await getScreenshotROIs(input);

  const entries = await Promise.all(
    PVP_SCREENSHOT_REGIONS.map(
      async (region) =>
        [
          region,
          await encodeROI(rois[region], PVP_SCREENSHOT_ROI_BOUNDS[region]),
        ] as const,
    ),
  );

  return Object.fromEntries(entries) as PVPScreenshotROIImages;
}
