import { drawPvpPixels } from "@/lib/pvp/canvas";
import {
  PVP_REPORT_SIZE,
  type PvpAlignmentDiagnostics,
  PvpScreenshotAlignmentError,
  detectPvpReportAlignment,
  refinePvpReportAlignment,
} from "@/lib/pvp/screenshot-layout";
import {
  type PVPScreenshotROIImages,
  type PVPScreenshotROIs,
  PVP_SCREENSHOT_REGIONS,
  PVP_SCREENSHOT_ROI_BOUNDS,
} from "@/lib/pvp/screenshot-types";

export { PVP_SCREENSHOT_ROI_BOUNDS } from "@/lib/pvp/screenshot-types";
export type {
  PVPScreenshotROIs,
  PVPScreenshotROIImages,
} from "@/lib/pvp/screenshot-types";

async function alignScreenshot(sourceUrl: string) {
  const image = new Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Failed to decode screenshot"));
    image.src = sourceUrl;
  });

  const source = document.createElement("canvas");
  source.width = image.naturalWidth;
  source.height = image.naturalHeight;

  const context = source.getContext("2d");

  if (!context) {
    throw new Error("Canvas rendering is unavailable.");
  }

  context.drawImage(image, 0, 0);

  const analysis = document.createElement("canvas");

  const ratio = Math.min(1, 900 / Math.max(source.width, source.height));

  analysis.width = Math.max(1, Math.round(source.width * ratio));
  analysis.height = Math.max(1, Math.round(source.height * ratio));

  const analysisContext = analysis.getContext("2d");

  if (!analysisContext) {
    throw new Error("Canvas rendering is unavailable.");
  }

  analysisContext.drawImage(source, 0, 0, analysis.width, analysis.height);

  const sourceImage = {
    width: source.width,
    height: source.height,
    pixels: context.getImageData(0, 0, source.width, source.height).data,
  };

  let ratioX = analysis.width / source.width;
  let ratioY = analysis.height / source.height;
  let detected: ReturnType<typeof detectPvpReportAlignment>;

  try {
    detected = detectPvpReportAlignment({
      width: analysis.width,
      height: analysis.height,
      pixels: analysisContext.getImageData(
        0,
        0,
        analysis.width,
        analysis.height,
      ).data,
    });
  } catch (error) {
    if (!(error instanceof PvpScreenshotAlignmentError)) {
      throw error;
    }

    detected = detectPvpReportAlignment(sourceImage);
    ratioX = 1;
    ratioY = 1;
  }

  const toSource = (candidate: typeof detected.alignment) => ({
    ...candidate,
    scale: candidate.scale / ratioX,
    offsetX: candidate.offsetX / ratioX,
    offsetY: candidate.offsetY / ratioY,
    rules: candidate.rules.map((rule) => ({
      left: rule.left / ratioX,
      right: rule.right / ratioX,
      y: rule.y / ratioY,
    })),
  });

  const alignment = refinePvpReportAlignment(
    sourceImage,
    toSource(detected.alignment),
  );

  const diagnostics: PvpAlignmentDiagnostics = {
    imageSize: { width: source.width, height: source.height },
    rules: detected.diagnostics.rules.map((rule) => ({
      left: rule.left / ratioX,
      right: rule.right / ratioX,
      y: rule.y / ratioY,
    })),
    candidates: detected.diagnostics.candidates.map(toSource),
  };

  const normalized = document.createElement("canvas");
  normalized.width = PVP_REPORT_SIZE.width;
  normalized.height = PVP_REPORT_SIZE.height;

  const output = normalized.getContext("2d");

  if (!output) {
    throw new Error("Canvas rendering is unavailable.");
  }

  output.fillStyle = "#f7f7f5";
  output.fillRect(0, 0, normalized.width, normalized.height);
  output.imageSmoothingQuality = "high";
  output.drawImage(
    source,
    -alignment.offsetX / alignment.scale,
    -alignment.offsetY / alignment.scale,
    source.width / alignment.scale,
    source.height / alignment.scale,
  );

  return { source, normalized, alignment, diagnostics };
}

async function getCroppedScreenshot(
  sourceUrl: string,
): Promise<HTMLCanvasElement> {
  return (await alignScreenshot(sourceUrl)).normalized;
}

export async function getScreenshotPreview(input: File) {
  const sourceUrl = URL.createObjectURL(input);

  try {
    const { source, normalized, alignment, diagnostics } =
      await alignScreenshot(sourceUrl);

    const context = source.getContext("2d");

    if (!context) {
      throw new Error("Canvas rendering is unavailable.");
    }

    context.strokeStyle = "#00a040";
    context.lineWidth = Math.max(2, alignment.scale * 3);

    for (const rule of alignment.rules) {
      context.beginPath();
      context.moveTo(rule.left, rule.y);
      context.lineTo(rule.right, rule.y);
      context.stroke();
    }

    const [overlay, report, regions] = await Promise.all([
      encodeCanvas(source),
      encodeCanvas(normalized),
      encodeRegions(extractRegions(normalized)),
    ]);

    return { overlay, report, regions, alignment, diagnostics };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  errorMessage = "Failed to encode normalized screenshot",
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
    return extractRegions(screenshot);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function extractRegions(screenshot: HTMLCanvasElement): PVPScreenshotROIs {
  return Object.fromEntries(
    PVP_SCREENSHOT_REGIONS.map((region) => [
      region,
      getROI(screenshot, PVP_SCREENSHOT_ROI_BOUNDS[region]),
    ]),
  ) as PVPScreenshotROIs;
}

async function encodeRegions(
  rois: PVPScreenshotROIs,
): Promise<PVPScreenshotROIImages> {
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

export async function getScreenshotROIImages(
  input: File,
): Promise<PVPScreenshotROIImages> {
  return encodeRegions(await getScreenshotROIs(input));
}
