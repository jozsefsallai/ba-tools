import { buildCDNAbsoluteUrl } from "@/lib/url";
import type { Club, School, Student } from "@prisma/client";

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
  {
    name: "Chesed",
    id: "Chesed",
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

export const GROUP_EMBLEM_SCHOOLS: EmblemConfigItem<School>[] = [
  {
    name: "Abydos High School",
    id: "Abydos",
  },
  {
    name: "Gehenna Academy",
    id: "Gehenna",
  },
  {
    name: "Highlander Railroad Academy",
    id: "Highlander",
  },
  {
    name: "Allied Hyakkiyako Academy",
    id: "Hyakkiyako",
  },
  {
    name: "Millennium Science School",
    id: "Millennium",
  },
  {
    name: "Red Winter Federal Academy",
    id: "RedWinter",
  },
  {
    name: "Shanhaijing Academy",
    id: "Shanhaijing",
  },
  {
    name: "SRT Academy",
    id: "SRT",
  },
  {
    name: "Trinity General School",
    id: "Trinity",
  },
  {
    name: "Valkyrie Police School",
    id: "Valkyrie",
  },
  {
    name: "Wildhunt Art Academy",
    id: "WildHunt",
  },
];

export const GROUP_EMBLEM_CLUBS: EmblemConfigItem<Club>[] = [
  { id: "Kohshinjo68", name: "Problem Solver 68" },
  { id: "Justice", name: "Justice Task Force" },
  { id: "CleanNClearing", name: "Cleaning & Clearing" },
  { id: "BookClub", name: "Library Committee" },
  { id: "Countermeasure", name: "Foreclosure Task Force" },
  { id: "Engineer", name: "Engineering Department" },
  { id: "FoodService", name: "School Lunch Club" },
  { id: "Fuuki", name: "Prefect Team" },
  { id: "GourmetClub", name: "Gourmet Research Society" },
  { id: "HoukagoDessert", name: "After-School Sweets Club" },
  { id: "KnightsHospitaller", name: "Remedial Knights" },
  { id: "MatsuriOffice", name: "Festival Operations Department" },
  { id: "Meihuayuan", name: "Plum Blossom Garden" },
  { id: "Onmyobu", name: "Yin-Yang Club" },
  { id: "RemedialClass", name: "Make-Up Work Club" },
  { id: "SPTF", name: "Super Phenomenon Task Force" },
  { id: "Shugyobu", name: "Inner Discipline Club" },
  { id: "Endanbou", name: "Eastern Alchemy Society" },
  { id: "TheSeminar", name: "Seminar" },
  { id: "TrainingClub", name: "Athletics Training Club" },
  { id: "TrinityVigilance", name: "Trinity's Vigilante Crew" },
  { id: "Veritas", name: "Veritas" },
  { id: "NinpoKenkyubu", name: "Ninjutsu Research Club" },
  { id: "GameDev", name: "Game Development Department" },
  { id: "RedwinterSecretary", name: "Red Winter Office" },
  { id: "anzenkyoku", name: "Public Safety Bureau" },
  { id: "SisterHood", name: "The Sisterhood" },
  { id: "Class227", name: "Spec Ops No. 227" },
  { id: "Emergentology", name: "Medical Emergency Club" },
  { id: "RabbitPlatoon", name: "RABBIT Squad" },
  { id: "PandemoniumSociety", name: "Pandemonium Society" },
  { id: "HotSpringsDepartment", name: "Hot Springs Department" },
  { id: "TeaParty", name: "Tea Party" },
  { id: "PublicPeaceBureau", name: "Public Peace Bureau" },
  { id: "BlackTortoisePromenade", name: "Black Tortoise Promenade" },
  { id: "Genryumon", name: "Genryumon" },
  { id: "LaborParty", name: "Labor Party" },
  { id: "KnowledgeLiberationFront", name: "Knowledge Liberation Front" },
  { id: "Hyakkayouran", name: "Hyakkaryouran Resolution Council" },
  { id: "ShinySparkleSociety", name: "Sparkle Club" },
  { id: "AbydosStudentCouncil", name: "Abydos Student Council" },
  { id: "CentralControlCenter", name: "Central Control Center" },
  { id: "FreightLogisticsDepartment", name: "Freight Logistics Department" },
  { id: "OccultClub", name: "Occult Research Society" },
  { id: "FreeTradeCartel", name: "Special Trade Department" },
];

export const GROUP_EMBLEM_VALID_COMBINATIONS: {
  school: School;
  club: Club;
}[] = [
  { club: "Kohshinjo68", school: "Gehenna" },
  { club: "Justice", school: "Trinity" },
  { club: "CleanNClearing", school: "Millennium" },
  { club: "BookClub", school: "Trinity" },
  { club: "Countermeasure", school: "Abydos" },
  { club: "Engineer", school: "Millennium" },
  { club: "FoodService", school: "Gehenna" },
  { club: "Fuuki", school: "Gehenna" },
  { club: "GourmetClub", school: "Gehenna" },
  { club: "HoukagoDessert", school: "Trinity" },
  { club: "KnightsHospitaller", school: "Trinity" },
  { club: "MatsuriOffice", school: "Hyakkiyako" },
  { club: "Meihuayuan", school: "Shanhaijing" },
  { club: "Onmyobu", school: "Hyakkiyako" },
  { club: "RemedialClass", school: "Trinity" },
  { club: "SPTF", school: "Millennium" },
  { club: "Shugyobu", school: "Hyakkiyako" },
  { club: "Endanbou", school: "Shanhaijing" },
  { club: "TheSeminar", school: "Millennium" },
  { club: "TrainingClub", school: "Millennium" },
  { club: "TrinityVigilance", school: "Trinity" },
  { club: "Veritas", school: "Millennium" },
  { club: "NinpoKenkyubu", school: "Hyakkiyako" },
  { club: "GameDev", school: "Millennium" },
  { club: "RedwinterSecretary", school: "RedWinter" },
  { club: "anzenkyoku", school: "Valkyrie" },
  { club: "SisterHood", school: "Trinity" },
  { club: "Class227", school: "RedWinter" },
  { club: "Emergentology", school: "Gehenna" },
  { club: "RabbitPlatoon", school: "SRT" },
  { club: "PandemoniumSociety", school: "Gehenna" },
  { club: "HotSpringsDepartment", school: "Gehenna" },
  { club: "TeaParty", school: "Trinity" },
  { club: "PublicPeaceBureau", school: "Valkyrie" },
  { club: "BlackTortoisePromenade", school: "Shanhaijing" },
  { club: "Genryumon", school: "Shanhaijing" },
  { club: "LaborParty", school: "RedWinter" },
  { club: "KnowledgeLiberationFront", school: "RedWinter" },
  { club: "Hyakkayouran", school: "Hyakkiyako" },
  { club: "ShinySparkleSociety", school: "Gehenna" },
  { club: "AbydosStudentCouncil", school: "Abydos" },
  { club: "CentralControlCenter", school: "Highlander" },
  {
    club: "FreightLogisticsDepartment",
    school: "Highlander",
  },
  { club: "OccultClub", school: "WildHunt" },
  { club: "FreeTradeCartel", school: "WildHunt" },
];

export const DEFAULT_BASIC_EMBLEM_TEXTS = [
  "New Sensei",
  "Schale's Sensei",
  "Welcome",
  "Hello",
  "A pleasure to meet you",
];

export type FavorEmblemExtra = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  devName: string;
};

export const FAVOR_EMBLEM_EXTRA_ARONA: FavorEmblemExtra = {
  id: "arona",
  name: "Arona",
  firstName: "Arona",
  lastName: "",
  devName: "Arona",
};

export const FAVOR_EMBLEM_EXTRA_PLANA: FavorEmblemExtra = {
  id: "plana",
  name: "Plana",
  firstName: "Plana",
  lastName: "",
  devName: "Plana",
};

export type BossEmblemParams = {
  name: BossEmblemName;
  rarity: BossEmblemRarity;
  terrain: BossEmblemTerrain;
};

export type FavorEmblemParams = {
  student: Student | FavorEmblemExtra;
  rank: FavorEmblemRank;
  nameOverride?: string;
};

export type PotentialEmblemParams = {
  student: Student;
  rank: PotentialEmblemRank;
  nameOverride?: string;
};

export type GroupEmblemParams = {
  school: School;
  club?: Club;
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

export function buildGroupEmblemBackgroundUrl() {
  return buildCDNAbsoluteUrl("v2/images/emblems/bg/Emblem_BG_Group.png");
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

export function buildGroupEmblemIconUrl(school: School) {
  let finalSchool: string = school;

  if (school === "WildHunt") {
    finalSchool = "Wildhunt";
  }

  return buildCDNAbsoluteUrl(
    `v2/images/emblems/group/Emblem_Icon_Group_${finalSchool}.png`,
  );
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
