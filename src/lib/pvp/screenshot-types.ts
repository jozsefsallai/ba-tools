export const PVP_SCREENSHOT_REGIONS = [
  "enemyStudentRep",
  "battleTypeAndResult",
  "enemyName",
  "myUnits",
  "enemyUnits",
] as const;

export type PvpScreenshotRegion = (typeof PVP_SCREENSHOT_REGIONS)[number];

export type PvpScreenshotROIMap<T> = {
  [region in PvpScreenshotRegion]: T;
};

export const PVP_SCREENSHOT_ROI_BOUNDS: Record<
  PvpScreenshotRegion,
  readonly [x: number, y: number, w: number, h: number]
> = {
  enemyStudentRep: [1348, 116, 150, 125],
  battleTypeAndResult: [0, 122, 350, 125],
  enemyName: [1500, 100, 370, 80],
  myUnits: [46, 280, 830, 540],
  enemyUnits: [1044, 280, 830, 540],
};

export const PVP_SCREENSHOT_MAX_INPUT_SIZE = 10 * 1024 * 1024;
