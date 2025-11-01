import { buildCDNAbsoluteUrl } from "@/lib/url";
import type { Student } from "@prisma/client";
import type { ReactNode } from "react";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

export const EMBLEM_WIDTH = 558;
export const EMBLEM_HEIGHT = 106;

export type BossEmblemRarity = "N" | "R" | "SR" | "SSR";

export type BossEmblemName =
  | "Binah"
  | "Chesed"
  | "Goz"
  | "Hieronymus"
  | "HoverCraft"
  | "Kaitenger"
  | "Perorozilla"
  | "Shirokuro";

export type BossEmblemTerrain = "Indoor" | "Outdoor" | "Street";

export type FavorEmblemRank = 20 | 50 | 100;

export type PotentialEmblemRank = 25 | 50;

export type EmblemConfigItem<T> = {
  name: string;
  id: T;
};

export const BOSS_EMBLEM_RARITIES: EmblemConfigItem<BossEmblemRarity>[] = [
  {
    name: "Hard+",
    id: "N",
  },
  {
    name: "Hardcore+",
    id: "R",
  },
  {
    name: "Extreme+",
    id: "SR",
  },
  {
    name: "Insane+",
    id: "SSR",
  },
];

export const BOSS_EMBLEM_TERRAINS: EmblemConfigItem<BossEmblemTerrain>[] = [
  {
    name: "Indoor",
    id: "Indoor",
  },
  {
    name: "Field",
    id: "Outdoor",
  },
  {
    name: "Urban",
    id: "Street",
  },
];

export const BOSS_EMBLEM_NAMES: EmblemConfigItem<BossEmblemName>[] = [
  {
    name: "Binah",
    id: "Binah",
  },
  {
    name: "Goz",
    id: "Goz",
  },
  {
    name: "Hieronymus",
    id: "Hieronymus",
  },
  {
    name: "Hovercraft",
    id: "HoverCraft",
  },
  {
    name: "KAITEN",
    id: "Kaitenger",
  },
  {
    name: "Perorodzilla",
    id: "Perorozilla",
  },
  {
    name: "Shiro & Kuro",
    id: "Shirokuro",
  },
];

export const VALID_BOSS_EMBLEM_COMBINATIONS: {
  name: BossEmblemName;
  terrain: BossEmblemTerrain;
}[] = [
  { name: "Binah", terrain: "Outdoor" },
  { name: "Binah", terrain: "Street" },
  { name: "Chesed", terrain: "Outdoor" },
  { name: "Goz", terrain: "Outdoor" },
  { name: "Hieronymus", terrain: "Street" },
  { name: "HoverCraft", terrain: "Outdoor" },
  { name: "Kaitenger", terrain: "Street" },
  { name: "Perorozilla", terrain: "Outdoor" },
  { name: "Shirokuro", terrain: "Indoor" },
];

export const FAVOR_EMBLEM_RANKS: EmblemConfigItem<FavorEmblemRank>[] = [
  {
    name: "Rank 20",
    id: 20,
  },
  {
    name: "Rank 50",
    id: 50,
  },
  {
    name: "Rank 100",
    id: 100,
  },
];

export type BossEmblemParams = {
  name: BossEmblemName;
  rarity: BossEmblemRarity;
  terrain: BossEmblemTerrain;
};

export type FavorEmblemParams = {
  student: Student;
  rank: FavorEmblemRank;
  nameOverride?: string;
};

export type PotentialEmblemParams = {
  student: Student;
  rank: PotentialEmblemRank;
  nameOverride?: string;
};

export type BasicEmblemParams = {
  text: string;
};

export function buildBasicEmblemBackgroundUrl() {
  return buildCDNAbsoluteUrl("v2/images/emblems/bg/Emblem_BG_Default.png");
}

export function buildBossEmblemBackgroundUrl(rarity: BossEmblemRarity) {
  return buildCDNAbsoluteUrl(
    `v2/images/emblems/bg/Emblem_BG_Boss_${rarity}.png`,
  );
}

export function buildFavorEmblemBackgroundUrl(rank: FavorEmblemRank) {
  return buildCDNAbsoluteUrl(
    `v2/images/emblems/bg/Emblem_BG_Favor_${rank}.png`,
  );
}

export function buildBossEmblemOverlayUrl(
  name: BossEmblemName,
  terrain: BossEmblemTerrain,
) {
  return buildCDNAbsoluteUrl(
    `v2/images/emblems/boss/Emblem_Icon_Boss_BG_${name}_${terrain}.png`,
  );
}

export function buildBossIconUrl(name: BossEmblemName) {
  return buildCDNAbsoluteUrl(
    `v2/images/emblems/boss/Emblem_Icon_Boss_${name}.png`,
  );
}

export function buildFavorEmblemIconUrl(studentDevName: string) {
  return buildCDNAbsoluteUrl(
    `v2/images/emblems/favor/Emblem_Icon_Favor_${studentDevName}.png`,
  );
}

export function buildPotentialEmblemBackgroundUrl(rank: PotentialEmblemRank) {
  return buildCDNAbsoluteUrl(
    `v2/images/emblems/bg/Emblem_BG_Potential_${rank}.png`,
  );
}

function generatePNG(svgData: string) {
  const resvg = new Resvg(svgData, {
    fitTo: {
      mode: "width",
      value: EMBLEM_WIDTH,
    },
  });

  return resvg.render().asPng();
}

export async function makeEmblem(children: ReactNode, png = false) {
  const notoSansPath = buildCDNAbsoluteUrl(
    "v2/fonts/noto-sans/NotoSans-Regular.ttf",
  );

  const notoSansSemiboldPath = buildCDNAbsoluteUrl(
    "v2/fonts/noto-sans/NotoSans-SemiBold.ttf",
  );

  const notoSans = await fetch(notoSansPath).then((res) => res.arrayBuffer());
  const notoSansSemibold = await fetch(notoSansSemiboldPath).then((res) =>
    res.arrayBuffer(),
  );

  const svg = await satori(children, {
    width: EMBLEM_WIDTH,
    height: EMBLEM_HEIGHT,
    fonts: [
      {
        name: "Noto Sans",
        data: notoSans,
        weight: 400,
        style: "normal",
      },
      {
        name: "Noto Sans",
        data: notoSansSemibold,
        weight: 600,
        style: "normal",
      },
    ],
  });

  if (!png) {
    return svg;
  }

  return generatePNG(svg);
}

export function fitFont(
  text: string,
  baseFontSize: number,
  maxWidth: number,
  averageCharWidth = 0.6,
): number {
  const estimatedWidth = text.length * baseFontSize * averageCharWidth;

  if (estimatedWidth <= maxWidth) {
    return baseFontSize;
  }

  const adjustedFontSize = (maxWidth / estimatedWidth) * baseFontSize;
  return Number.parseFloat(adjustedFontSize.toFixed(2));
}
