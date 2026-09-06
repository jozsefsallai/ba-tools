"use server";

import { extractPvpBattleInfo } from "@/lib/pvp";
import { currentUser } from "@clerk/nextjs/server";

const MAX_REPORT_SIZE = 10 * 1024 * 1024;

export async function parsePvpCombatReport(formData: FormData) {
  if (!(await currentUser())) {
    throw new Error("Unauthorized");
  }

  const file = formData.get("screenshot");

  if (!(file instanceof File)) {
    throw new Error("A screenshot is required");
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Unsupported image type");
  }

  if (file.size === 0 || file.size > MAX_REPORT_SIZE) {
    throw new Error("Screenshot must be between 1 byte and 10 MB");
  }

  const result = await extractPvpBattleInfo(
    Buffer.from(await file.arrayBuffer()),
    file.type as "image/jpeg" | "image/png" | "image/webp",
  );

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
