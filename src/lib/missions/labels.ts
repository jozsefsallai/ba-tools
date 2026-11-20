import type { HexCoord } from "@/lib/game-data/contract";
import type { MissionDifficulty } from "~prisma";

/** `10-1H` for Hard missions, `10-1` for Normal ones. */
export function missionLabel(mission: {
  chapter: number;
  stage: number;
  difficulty: MissionDifficulty;
}) {
  return `${mission.chapter}-${mission.stage}${mission.difficulty === "Hard" ? "H" : ""}`;
}

export function parseMissionLabel(label: string) {
  const match = label.match(/^(\d+)-(\d+)(H?)$/i);
  if (!match) {
    return null;
  }

  return {
    chapter: Number(match[1]),
    stage: Number(match[2]),
    difficulty: (match[3] ? "Hard" : "Normal") as MissionDifficulty,
  };
}

export type HexDirection =
  | "upRight"
  | "right"
  | "downRight"
  | "downLeft"
  | "left"
  | "upLeft";

export function hexDirection(
  from: HexCoord,
  to: HexCoord,
): HexDirection | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (dx === 1 && dy === 0) {
    return "upRight";
  }

  if (dx === 1 && dy === -1) {
    return "right";
  }

  if (dx === 0 && dy === -1) {
    return "downRight";
  }

  if (dx === -1 && dy === 0) {
    return "downLeft";
  }

  if (dx === -1 && dy === 1) {
    return "left";
  }

  if (dx === 0 && dy === 1) {
    return "upLeft";
  }

  return null;
}

export const echelonName = (echelon: number) =>
  String.fromCharCode(65 + echelon);
