export const PVP_SCREENSHOT_REGIONS = [
  "battleTypeAndResult",
  "enemyName",
  "myUnits",
  "enemyUnits",
] as const;

export type PvpScreenshotRegion = (typeof PVP_SCREENSHOT_REGIONS)[number];

export type PvpScreenshotROIMap<T> = {
  [region in PvpScreenshotRegion]: T;
};

export const PVP_SCREENSHOT_ROI_MEDIA_TYPE = "image/jpeg" as const;
export const PVP_SCREENSHOT_MAX_INPUT_SIZE = 10 * 1024 * 1024;
export const PVP_SCREENSHOT_MAX_ROI_SIZE = 3 * 1024 * 1024;
