import type { Student } from "~prisma";

export const STAR_LEVELS = [1, 2, 3, 4, 5] as const;
export const UE_LEVELS = [1, 2, 3, 4] as const;

export const GAME_SERVERS = [
  "JP",
  "KR",
  "TW",
  "NA",
  "Asia",
  "EU",
  "CN",
] as const;

export const BORROW_SLOT_GAMEMODES = [
  "raid",
  "jfd",
  "conquest",
  "tower",
] as const;

export type StarLevel = (typeof STAR_LEVELS)[number];
export type UELevel = (typeof UE_LEVELS)[number];

export type GameServer = (typeof GAME_SERVERS)[number];

export type BorrowSlotGameMode = (typeof BORROW_SLOT_GAMEMODES)[number];

export const GAME_SERVER_NAMES: Record<GameServer, string> = {
  JP: "Japan",
  KR: "Korea",
  TW: "Taiwan, Hong Kong, Macao",
  NA: "North America",
  Asia: "Asia",
  EU: "Global (EU)",
  CN: "China",
};

export const BORROW_SLOT_GAMEMODE_NAMES: Record<BorrowSlotGameMode, string> = {
  raid: "Total Assault, Grand Assault, Allied Operation",
  jfd: "Joint Firing Drill",
  conquest: "Conquest",
  tower: "Final Restriction Release",
};

export type { Student };
