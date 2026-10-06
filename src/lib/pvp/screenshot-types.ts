export const PVP_SCREENSHOT_ROI_BOUNDS = {
  enemyStudentRep: [1348, 116, 150, 125],
  battleTypeAndResult: [0, 122, 350, 125],
  enemyName: [1500, 100, 370, 80],
  myUnits: [46, 280, 830, 540],
  enemyUnits: [1044, 280, 830, 540],
} as const;

export type PvpScreenshotRegion = keyof typeof PVP_SCREENSHOT_ROI_BOUNDS;

export const PVP_SCREENSHOT_REGIONS = Object.keys(
  PVP_SCREENSHOT_ROI_BOUNDS,
) as PvpScreenshotRegion[];

export type PvpScreenshotROIMap<T> = { [region in PvpScreenshotRegion]: T };
export type PVPScreenshotROIs = PvpScreenshotROIMap<Uint8ClampedArray>;
export type PVPScreenshotROIImages = PvpScreenshotROIMap<Blob>;

export const PVP_SCREENSHOT_INPUT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const PVP_SCREENSHOT_MAX_INPUT_SIZE = 10 * 1024 * 1024;
