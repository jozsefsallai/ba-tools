import type { PvpPixelImage } from "@/lib/pvp";
import type { PvpIconMatch } from "@/lib/pvp/icon-match";
import type { Student } from "@/lib/types";

export type IconDebugStudent = Pick<Student, "id" | "combatClass">;

export function iconDebugSlotIndices(
  combatClass: IconDebugStudent["combatClass"],
): readonly number[] {
  return combatClass === "Main" ? [0, 1, 2, 3] : [4, 5];
}

export type Cutout = { x: number; y: number; width: number; height: number };

export type IconDebugCase = {
  skipped?: boolean;
  crop?: PvpPixelImage;
  match?: PvpIconMatch;
  error?: string;
};

export type IconDebugResult = {
  studentId: string;
  representative: IconDebugCase;
  myTeam: IconDebugCase[];
  opponentTeam: IconDebugCase[];
  error?: string;
};

export function findTemplateCutouts(image: PvpPixelImage): Cutout[] {
  const { width, height, pixels } = image;

  const seen = new Uint8Array(width * height);
  const found: Cutout[] = [];
  const queue = new Int32Array(width * height);

  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || pixels[start * 4 + 3] >= 128) {
      continue;
    }

    let read = 0;
    let write = 1;

    queue[0] = start;
    seen[start] = 1;

    let left = width;
    let right = 0;
    let top = height;
    let bottom = 0;

    while (read < write) {
      const index = queue[read++];

      const x = index % width;
      const y = Math.floor(index / width);

      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);

      for (const next of [
        x > 0 ? index - 1 : -1,
        x + 1 < width ? index + 1 : -1,
        index - width,
        index + width,
      ]) {
        if (
          next >= 0 &&
          next < seen.length &&
          !seen[next] &&
          pixels[next * 4 + 3] < 128
        ) {
          seen[next] = 1;
          queue[write++] = next;
        }
      }
    }

    if (write > 100)
      found.push({
        x: left,
        y: top,
        width: right - left + 1,
        height: bottom - top + 1,
      });
  }

  const representatives = found
    .filter((box) => box.y < height / 2)
    .sort((a, b) => a.x - b.x);

  const teams = [false, true].map((right) =>
    found
      .filter((box) => box.y >= height / 2 && box.x >= width / 2 === right)
      .sort((a, b) => a.x - b.x),
  );

  if (
    width !== 2560 ||
    height !== 1600 ||
    found.length !== 14 ||
    representatives.length !== 2 ||
    teams.some((team) => team.length !== 6)
  ) {
    throw new Error(
      "Expected a 2560x1600 template with two representatives and six portraits per team.",
    );
  }

  return [...representatives, ...teams.flat()];
}

export function iconDebugCases(row: IconDebugResult) {
  return [row.representative, ...row.myTeam, ...row.opponentTeam].filter(
    (item) => !item.skipped,
  );
}

export function iconDebugCorrect(result: IconDebugCase, studentId: string) {
  return (
    !result.skipped && !result.error && result.match?.studentId === studentId
  );
}

export function failedIconDebugResult(
  studentId: string,
  error: string,
  combatClass: IconDebugStudent["combatClass"],
): IconDebugResult {
  const slots = iconDebugSlotIndices(combatClass);

  const team = () =>
    Array.from({ length: 6 }, (_, index) =>
      slots.includes(index) ? { error } : { skipped: true },
    );

  return {
    studentId,
    error,
    representative: { error },
    myTeam: team(),
    opponentTeam: team(),
  };
}
