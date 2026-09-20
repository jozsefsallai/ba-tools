export type BackgroundMode = "image" | "url";

export type ScenarioCharacterData = {
  id?: string;
  spriteUrl: string;
  filename: string;
  timestamp: number;
  x: number;
  y: number;
  scale: number;
  darken?: boolean;
  hologram?: boolean;
  silhouette?: boolean;
  silhouetteColor?: number;
  /** Sprite URLs registered per expression name (used by the script `CHARA_EXPR` command). */
  expressions?: Record<string, string>;
};

export type ScenarioFontData = {
  label: string;
  family: string;
  nameY?: number;
  affiliationY?: number;
};
