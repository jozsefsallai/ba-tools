"use server";

import { extractPvpBattleInfo } from "@/lib/pvp";
import {
  PVP_SCREENSHOT_MAX_ROI_SIZE,
  PVP_SCREENSHOT_REGIONS,
  PVP_SCREENSHOT_ROI_MEDIA_TYPE,
  type PvpScreenshotROIMap,
} from "@/lib/pvp-screenshot-types";
import { auth } from "@clerk/nextjs/server";

export async function parsePvpCombatReport(formData: FormData) {
  await auth.protect();

  const files = Object.fromEntries(
    PVP_SCREENSHOT_REGIONS.map((name) => [name, formData.get(name)]),
  ) as PvpScreenshotROIMap<FormDataEntryValue | null>;

  if (PVP_SCREENSHOT_REGIONS.some((name) => !(files[name] instanceof File))) {
    throw new Error("All screenshot regions are required");
  }

  const roiFiles = files as PvpScreenshotROIMap<File>;
  if (
    PVP_SCREENSHOT_REGIONS.some(
      (name) => roiFiles[name].type !== PVP_SCREENSHOT_ROI_MEDIA_TYPE,
    )
  ) {
    throw new Error("Screenshot regions must be JPEG images");
  }

  const totalSize = PVP_SCREENSHOT_REGIONS.reduce(
    (total, name) => total + roiFiles[name].size,
    0,
  );
  if (
    PVP_SCREENSHOT_REGIONS.some((name) => roiFiles[name].size === 0) ||
    totalSize > PVP_SCREENSHOT_MAX_ROI_SIZE
  ) {
    throw new Error("Screenshot regions must total between 1 byte and 3 MB");
  }

  const result = await extractPvpBattleInfo({
    battleTypeAndResult: Buffer.from(
      await roiFiles.battleTypeAndResult.arrayBuffer(),
    ),
    enemyName: Buffer.from(await roiFiles.enemyName.arrayBuffer()),
    myUnits: Buffer.from(await roiFiles.myUnits.arrayBuffer()),
    enemyUnits: Buffer.from(await roiFiles.enemyUnits.arrayBuffer()),
  });

  if (!result.valid || !result.battle) {
    return {
      valid: false as const,
      battle: null,
    };
  }

  return {
    valid: true as const,
    battle: result.battle,
  };
}
